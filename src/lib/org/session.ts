/**
 * The signed cookie that lets a paying organisation's pages open without signing in again on every page.
 *
 * Why a cookie and not the sign-in alone: the toolkit pages are rendered on the server, and the server only
 * learns who is asking from a cookie (the Firebase sign-in lives in the browser and is sent in a header by our
 * own scripts). `POST /api/org/session` checks the Firebase sign-in and the subscription, then sets this cookie;
 * the pages check its signature and then ask the store again whether the plan is still active, so a lapsed
 * plan stops opening them within a request, not when the cookie runs out.
 *
 * The cookie carries only the owner's id and an end time, signed with `SESSION_SECRET`. No secret, no plan,
 * no personal detail. Without a secret of at least 32 characters nothing is signed and nothing verifies: the
 * paywall fails closed.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "rc_org";
/** Short, so signing out (or a lapse) is felt quickly on a shared computer. */
export const SESSION_TTL_MS = 30 * 60 * 1000;
/** Only the organisation pages need it. */
export const SESSION_PATH = "/partners";

type Env = Record<string, string | undefined>;

export function sessionSecret(env: Env = process.env): string | null {
  const value = env.SESSION_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

const encode = (buffer: Buffer) => buffer.toString("base64url");

export function signSession(uid: string, secret: string, now: number): string {
  const payload = encode(Buffer.from(JSON.stringify({ u: uid, e: now + SESSION_TTL_MS })));
  return `${payload}.${encode(createHmac("sha256", secret).update(payload).digest())}`;
}

/** The owner's id if the value is one of ours and has not ended, otherwise `null`. */
export function verifySession(value: string | null | undefined, secret: string | null, now: number): string | null {
  if (!value || !secret || value.length > 400) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = createHmac("sha256", secret).update(parts[0]).digest();
  const given = Buffer.from(parts[1], "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { u?: unknown; e?: unknown };
    return typeof data.u === "string" && data.u && typeof data.e === "number" && now < data.e ? data.u : null;
  } catch {
    return null;
  }
}
