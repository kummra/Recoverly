import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { deleteAllUserData } from "@/lib/oracle-storage";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { firestoreShareStore } from "@/lib/share-firestore";
import { stopAllShares } from "@/lib/share-service";

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
 * `recursiveDelete` removes the `users/{uid}` document and EVERY subcollection
 * under it, whatever it is called (drinkRecords, cravingEvents, aiChats and their
 * messages, and the server-written `feedback` survey answers), then the Firebase
 * Auth user is removed so the identity is gone too. The privacy text promises
 * this for anything stored under a person's document, so keep new per-person
 * data there and it is covered without a change here.
 *
 * The one thing that is NOT under the person's document is a summary link they
 * made (`shares`, see `lib/share.ts`): it is stored by itself so that anyone with
 * the link can open it without an account. It is removed here, explicitly, so
 * that "delete everything" ends every link too (`privacy.s13*` promises this).
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

    const limited = rateLimit(`acctdel:${uid}`, LIMITS.accountDelete.limit, LIMITS.accountDelete.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    // Delete all Firestore data under this user, plus the Oracle Cloud mirror,
    // then the auth account itself — so "delete everything" holds in BOTH stores.
    await adminDb.recursiveDelete(adminDb.collection("users").doc(uid));
    await stopAllShares(firestoreShareStore(adminDb), uid);
    await deleteAllUserData(uid);
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
