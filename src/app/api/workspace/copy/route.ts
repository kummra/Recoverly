import { NextRequest, NextResponse } from "next/server";

import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { findWorkspaceTeam } from "@/lib/programme-register";
import { normaliseCode } from "@/lib/programme";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getUserIdFromRequest } from "@/lib/server-auth";
import { WORKSPACE_LIMITS } from "@/lib/workspace";
import { firestoreWorkspaceStore } from "@/lib/workspace-firestore";
import { listOwnCopies, putCopy, stopAllCopies, stopCopy } from "@/lib/workspace-service";

export const runtime = "nodejs";

/** The scrambled summary and key plus a little JSON around them. */
const MAX_BODY_BYTES = WORKSPACE_LIMITS.ciphertextMaxChars + 2_000;

const unavailable = () => NextResponse.json({ error: "unavailable" }, { status: 503 });

/** The fingerprint of the key a team has in the register now, or `null`. */
const currentKeyId = (code: string): string | null => findWorkspaceTeam(code)?.keyId ?? null;

/**
 * A signed-in person's workspace copies: send or update one (PUT), see what they share (GET),
 * stop one or all (DELETE). What arrives is already scrambled in their browser for the team's
 * key (`lib/workspace-crypto.ts`); this route never sees the contents, only a nonce, ciphertext
 * and wrapped key. The team reads them through `inbox/route.ts`. See `lib/workspace.ts`.
 */
export async function PUT(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) return unavailable();
    const uid = await getUserIdFromRequest(request);
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const limited = rateLimit(`workspace-send:${uid}`, LIMITS.workspaceSend.limit, LIMITS.workspaceSend.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "too-large" }, { status: 413 });
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const fields = body as Record<string, unknown>;

    const result = await putCopy(firestoreWorkspaceStore(adminDb), findWorkspaceTeam(fields.code), uid, fields, Date.now());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, ...result.value });
  } catch (error) {
    // The message only: it never contains the (scrambled) summary.
    // eslint-disable-next-line no-console
    console.error("[PUT /api/workspace/copy]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) return unavailable();
    const uid = await getUserIdFromRequest(request);
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const limited = rateLimit(`workspace-manage:${uid}`, LIMITS.workspaceManage.limit, LIMITS.workspaceManage.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const result = await listOwnCopies(firestoreWorkspaceStore(adminDb), uid, Date.now(), currentKeyId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ copies: result.value });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[GET /api/workspace/copy]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}

/** `?code=…` stops sharing with one team; `?all=1` stops everything this person shares. */
export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) return unavailable();
    const uid = await getUserIdFromRequest(request);
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const limited = rateLimit(`workspace-manage:${uid}`, LIMITS.workspaceManage.limit, LIMITS.workspaceManage.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const store = firestoreWorkspaceStore(adminDb);
    const params = request.nextUrl.searchParams;
    if (params.get("all") === "1") {
      const result = await stopAllCopies(store, uid);
      return NextResponse.json({ ok: true, stopped: result.ok ? result.value : 0 });
    }
    const code = normaliseCode(params.get("code"));
    if (!code) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const result = await stopCopy(store, uid, code);
    return NextResponse.json({ ok: true, stopped: result.ok ? result.value : 0 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[DELETE /api/workspace/copy]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
