import { NextRequest, NextResponse } from "next/server";

import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getUserIdFromRequest } from "@/lib/server-auth";
import { SHARE_LIMITS } from "@/lib/share";
import { firestoreShareStore } from "@/lib/share-firestore";
import { createShare, listShares, stopAllShares, stopShare } from "@/lib/share-service";

export const runtime = "nodejs";

/** The scrambled summary plus a little JSON around it. */
const MAX_BODY_BYTES = SHARE_LIMITS.ciphertextMaxChars + 1_000;

const unavailable = () => NextResponse.json({ error: "unavailable" }, { status: 503 });

/**
 * A signed-in person's summary links: make one (POST), see theirs (GET), stop one
 * or all (DELETE). What arrives is already scrambled in their browser
 * (`lib/share-crypto.ts`); this route never sees the key or the contents, only a
 * nonce, ciphertext and how long it should last. See `lib/share.ts` for why.
 * Opening a link is the public route in `[id]/route.ts`.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) return unavailable();
    const uid = await getUserIdFromRequest(request);
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const limited = rateLimit(`share-create:${uid}`, LIMITS.shareCreate.limit, LIMITS.shareCreate.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "too-large" }, { status: 413 });
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) return NextResponse.json({ error: "invalid" }, { status: 400 });

    const result = await createShare(firestoreShareStore(adminDb), uid, body as Record<string, unknown>, Date.now());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, ...result.value });
  } catch (error) {
    // The message only: it never contains the (scrambled) summary.
    // eslint-disable-next-line no-console
    console.error("[POST /api/share]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) return unavailable();
    const uid = await getUserIdFromRequest(request);
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const limited = rateLimit(`share-manage:${uid}`, LIMITS.shareManage.limit, LIMITS.shareManage.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const result = await listShares(firestoreShareStore(adminDb), uid, Date.now());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ shares: result.value });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[GET /api/share]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}

/** `?id=…` stops one link; `?all=1` stops every link this person has. */
export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) return unavailable();
    const uid = await getUserIdFromRequest(request);
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const limited = rateLimit(`share-manage:${uid}`, LIMITS.shareManage.limit, LIMITS.shareManage.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const store = firestoreShareStore(adminDb);
    const params = request.nextUrl.searchParams;
    if (params.get("all") === "1") {
      const result = await stopAllShares(store, uid);
      return NextResponse.json({ ok: true, stopped: result.ok ? result.value : 0 });
    }
    const result = await stopShare(store, uid, params.get("id") ?? "");
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[DELETE /api/share]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
