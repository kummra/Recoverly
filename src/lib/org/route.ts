/**
 * What every organisation-portal, billing and owner route does first, so each route is only its own rule:
 * answer "unavailable" when there is no database, refuse another site's page, check the sign-in, apply the
 * per-person rate limit, and read a small JSON body. Answers are never cached.
 */
import { NextResponse, type NextRequest } from "next/server";

import { ORG_ERROR_STATUS, OrgError } from "@/lib/org/errors";
import { LOGO_MIME, type StoredLogo } from "@/lib/org/logo-model";
import { isOwner } from "@/lib/org/owner";
import { type RateLimitResult, LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { fromOurOwnPages } from "@/lib/request-guards";
import { type RequestUser, getUserFromRequest } from "@/lib/server-auth";

export const NO_STORE = { "Cache-Control": "no-store" } as const;

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export const unavailable = () => json({ error: "unavailable" }, 503);

type Bucket = keyof Pick<typeof LIMITS, "orgManage" | "orgSession" | "billing" | "ownerManage">;

/** The signed-in person, or the response to send instead (403, 401, 404 for the owner pages, or 429). */
export async function requireUser(request: NextRequest, bucket: Bucket, options: { owner?: boolean } = {}): Promise<{ user: RequestUser } | { response: Response }> {
  if (request.method !== "GET" && !fromOurOwnPages(request)) return { response: json({ error: "forbidden" }, 403) };
  const user = await getUserFromRequest(request);
  if (!user) return { response: json({ error: "unauthorized" }, 401) };
  // The owner pages answer 404 to anyone else, so they are not even known to exist.
  if (options.owner && !isOwner(user.uid)) return { response: json({ error: "not-found" }, 404) };
  const limited: RateLimitResult = rateLimit(`${bucket}:${user.uid}`, LIMITS[bucket].limit, LIMITS[bucket].windowMs);
  if (!limited.allowed) return { response: tooManyRequests(limited.retryAfter) };
  return { user };
}

/** A small JSON object from the request body, or the response to send instead. */
export async function readJson(request: NextRequest, maxBytes: number): Promise<{ body: Record<string, unknown> } | { response: Response }> {
  const raw = await request.text();
  if (raw.length > maxBytes) return { response: json({ error: "too-large" }, 413) };
  try {
    const body: unknown = raw ? JSON.parse(raw) : {};
    if (typeof body !== "object" || body === null || Array.isArray(body)) return { response: json({ error: "invalid" }, 400) };
    return { body: body as Record<string, unknown> };
  } catch {
    return { response: json({ error: "invalid" }, 400) };
  }
}

/**
 * A stored logo as an image. The type is the one the bytes were checked as, `nosniff` stops a browser guessing another, and the
 * rest says that this response is only ever a picture: no script, no framing, no use by another site.
 */
export function imageResponse(logo: StoredLogo, cache: string): Response {
  return new Response(new Uint8Array(Buffer.from(logo.data, "base64")), {
    headers: {
      "Content-Type": LOGO_MIME[logo.type],
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Cache-Control": cache
    }
  });
}

/** A refusal from the portal code becomes its status and message; anything else is a plain 500 that says nothing about why. */
export function failure(route: string, error: unknown): Response {
  if (error instanceof OrgError) return json({ error: error.code, message: error.message, ...(error.details.length ? { details: error.details } : {}) }, ORG_ERROR_STATUS[error.code]);
  // The message only, never a body or a key.
  // eslint-disable-next-line no-console
  console.error(`[${route}]`, error instanceof Error ? error.message : "unknown error");
  return json({ error: "unavailable" }, 500);
}
