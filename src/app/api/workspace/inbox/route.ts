import { NextRequest, NextResponse } from "next/server";

import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { findWorkspaceByReportKey } from "@/lib/programme-register";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { callerKey } from "@/lib/request-guards";
import { firestoreWorkspaceStore } from "@/lib/workspace-firestore";
import { readInbox } from "@/lib/workspace-service";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/**
 * What a team is handed: the scrambled copies people chose to send to it. The team proves it is
 * the team with its private report key, sent as `Authorization: Bearer <key>` (not in the address,
 * so it is not in a URL log). A wrong or missing key and a programme with no workspace answer the
 * same "not found".
 *
 * What comes back is useless to anyone but the team: every copy is scrambled for the team's
 * private key, which exists only in the team's browser. So even a report key that leaked can only
 * list scrambled copies; it cannot read them, and it cannot swap the team's key (that lives in the
 * register, not here). No account or address of any sender is in the answer: only opaque ids.
 */
export async function GET(request: NextRequest) {
  try {
    const caller = rateLimit(`workspace-inbox:${callerKey(request)}`, LIMITS.workspaceInbox.limit, LIMITS.workspaceInbox.windowMs);
    if (!caller.allowed) return tooManyRequests(caller.retryAfter);

    if (!isAdminConfigured || !adminDb) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });

    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    const team = findWorkspaceByReportKey(token);
    if (!team) return NextResponse.json({ error: "not-found" }, { status: 404, headers: NO_STORE });

    const result = await readInbox(firestoreWorkspaceStore(adminDb), team, Date.now());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
    return NextResponse.json(result.value, { headers: NO_STORE });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[GET /api/workspace/inbox]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500, headers: NO_STORE });
  }
}
