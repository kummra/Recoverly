import { NextRequest } from "next/server";

import { activeMembership } from "@/lib/org/membership";
import { failure, json, requireUser, unavailable } from "@/lib/org/route";
import { orgStore } from "@/lib/org/server";
import { SESSION_COOKIE, SESSION_PATH, SESSION_TTL_MS, sessionSecret, signSession } from "@/lib/org/session";

export const runtime = "nodejs";

/**
 * Opens the members' pages in this browser. The caller proves who they are with their Firebase sign-in (a header,
 * so another site cannot make this call for them); if their organisation has an active plan, a short signed cookie is set
 * so the server-rendered toolkit pages can tell. The pages check the plan again on every request, so the cookie
 * outliving a plan opens nothing. No secret, plan or detail is in the cookie (`lib/org/session.ts`).
 */
export async function POST(request: NextRequest) {
  try {
    const secret = sessionSecret();
    if (!orgStore || !secret) return unavailable();
    const auth = await requireUser(request, "orgSession");
    if ("response" in auth) return auth.response;

    const org = await orgStore.getOrg(auth.user.uid);
    if (!org) return json({ error: "no-organisation" }, 404);
    if (!(await activeMembership(orgStore, auth.user.uid, Date.now()))) return json({ error: "no-plan" }, 402);

    const response = json({ ok: true });
    response.cookies.set({ name: SESSION_COOKIE, value: signSession(auth.user.uid, secret, Date.now()), httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: SESSION_PATH, maxAge: SESSION_TTL_MS / 1000 });
    return response;
  } catch (error) {
    return failure("POST /api/org/session", error);
  }
}

/** Signing out of the members' pages. Needs no sign-in: it can only remove this browser's own cookie. */
export async function DELETE() {
  const response = json({ ok: true });
  response.cookies.set({ name: SESSION_COOKIE, value: "", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: SESSION_PATH, maxAge: 0 });
  return response;
}
