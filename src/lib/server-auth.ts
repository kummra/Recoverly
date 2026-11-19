import type { NextRequest } from "next/server";

import { adminAuth } from "@/lib/firebase-admin";

export type RequestUser = { uid: string; email: string | null; emailVerified: boolean };

/**
 * The signed-in person making a request: their uid, and their address only if the account has confirmed it.
 * `null` if there is no valid Firebase ID token. Used where an address matters (the organisation portal keeps
 * a confirmed one for receipts); everything else needs only `getUserIdFromRequest`.
 */
export async function getUserFromRequest(request: NextRequest): Promise<RequestUser | null> {
  if (!adminAuth) return null;
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7));
    return { uid: decoded.uid, email: typeof decoded.email === "string" ? decoded.email : null, emailVerified: decoded.email_verified === true };
  } catch {
    return null;
  }
}

/**
 * The uid of the signed-in person making a request, from the Firebase ID token
 * in the Authorization header, or `null` if there is none or it is not valid
 * (missing, expired, revoked, malformed). Callers answer 401 on `null`.
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  if (!adminAuth) return null;
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}
