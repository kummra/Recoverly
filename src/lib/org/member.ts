/**
 * Who is looking at a members' page, on the server. The browser holds a short signed cookie (`session.ts`);
 * this checks its signature and then asks the store whether that owner's organisation still has an active plan
 * that includes the toolkit. Fails closed: no secret, no database, no cookie or a lapsed plan all mean "not a member".
 */
import { cookies } from "next/headers";

import { planAllows } from "@/lib/billing/catalogue";
import { type Membership, activeMembership } from "@/lib/org/membership";
import { orgStore } from "@/lib/org/server";
import { SESSION_COOKIE, sessionSecret, verifySession } from "@/lib/org/session";

export async function currentMember(): Promise<Membership | null> {
  // Read the cookies first, always. Next decides a page is per-request only when it sees `cookies()` called; a page that
  // returned early (no secret, no database) would be built once as static HTML and shown to every visitor, member or not.
  const jar = await cookies();
  const secret = sessionSecret();
  if (!secret || !orgStore) return null;
  const now = Date.now();
  const uid = verifySession(jar.get(SESSION_COOKIE)?.value, secret, now);
  if (!uid) return null;
  const membership = await activeMembership(orgStore, uid, now);
  return membership && planAllows(membership.plan, "toolkit") ? membership : null;
}
