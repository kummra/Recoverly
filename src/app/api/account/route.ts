import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  if (!adminAuth) return null;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * Permanently delete the authenticated user's account and ALL of their data.
 *
 * This backs the privacy-policy promise of self-serve deletion (privacy rule #4):
 * `recursiveDelete` removes the `users/{uid}` document and every subcollection
 * (drinkRecords, aiChats and their messages), then the Firebase Auth user is
 * removed so the identity is gone too.
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb || !adminAuth) {
      return NextResponse.json(
        { error: "Server is not configured for account deletion." },
        { status: 500 }
      );
    }

    const uid = await getUserIdFromRequest(request);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all Firestore data under this user, then the auth account itself.
    await adminDb.recursiveDelete(adminDb.collection("users").doc(uid));
    await adminAuth.deleteUser(uid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[DELETE /api/account]", error);
    return NextResponse.json(
      { error: "Could not delete your account. Please try again." },
      { status: 500 }
    );
  }
}
