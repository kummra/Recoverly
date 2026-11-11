import type { NextRequest } from "next/server";

import { adminAuth } from "@/lib/firebase-admin";

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
