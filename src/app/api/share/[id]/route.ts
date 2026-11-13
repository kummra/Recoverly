import { NextRequest, NextResponse } from "next/server";

import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { callerKey } from "@/lib/request-guards";
import { firestoreShareStore } from "@/lib/share-firestore";
import { readShare } from "@/lib/share-service";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

/**
 * Hand over the scrambled copy behind a link. Public on purpose: the person
 * opening it (a doctor, a family member) has no account. What it returns is a
 * nonce and ciphertext, which cannot be read without the key, and the key is the
 * part of the link after `#`, which the browser never sends here. So the address
 * alone, which this route sees, opens nothing.
 *
 * A link that never existed, one that has ended and one that was stopped all
 * answer the same way, so the address reveals nothing about itself. Nothing is
 * recorded about who asked. (`next.config.mjs` already marks everything under
 * `/api` as not to be cached.)
 */
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const caller = rateLimit(`share-read:${callerKey(request)}`, LIMITS.shareRead.limit, LIMITS.shareRead.windowMs);
    if (!caller.allowed) return tooManyRequests(caller.retryAfter);
    const overall = rateLimit("share-read:all", LIMITS.shareReadAll.limit, LIMITS.shareReadAll.windowMs);
    if (!overall.allowed) return tooManyRequests(overall.retryAfter);

    if (!isAdminConfigured || !adminDb) return NextResponse.json({ error: "unavailable" }, { status: 503 });

    const { id } = await params;
    const result = await readShare(firestoreShareStore(adminDb), id, Date.now());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: { "X-Robots-Tag": "noindex" } });
    return NextResponse.json(result.value, { headers: { "X-Robots-Tag": "noindex" } });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[GET /api/share/:id]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
