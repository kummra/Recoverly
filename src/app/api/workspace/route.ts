import { NextRequest, NextResponse } from "next/server";

import { findWorkspaceTeam } from "@/lib/programme-register";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getUserIdFromRequest } from "@/lib/server-auth";

export const runtime = "nodejs";

/**
 * Which key to scramble a summary for, when a person in a programme chooses to share it with
 * the programme's team: `GET /api/workspace?code=ACMELOGI26`, signed in.
 *
 * The answer is the team's PUBLIC key and its fingerprint, taken from the register where the
 * owner put them (`lib/programme-register.ts`), never from anything a caller can send. Public
 * keys are not secret; the sign-in is only so a script cannot hammer it. The sample programme
 * answers `{ practice: true }`, which the device uses to try the whole thing with a key it makes
 * itself. A programme with no workspace, or none yet, answers "not found", the same as a code
 * that does not exist.
 */
export async function GET(request: NextRequest) {
  try {
    const uid = await getUserIdFromRequest(request);
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const limited = rateLimit(`workspace-manage:${uid}`, LIMITS.workspaceManage.limit, LIMITS.workspaceManage.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const team = findWorkspaceTeam(request.nextUrl.searchParams.get("code"));
    if (!team) return NextResponse.json({ error: "not-found" }, { status: 404 });
    if (team.practice || !team.publicKey || !team.keyId) return NextResponse.json({ practice: true });
    return NextResponse.json({ publicKey: team.publicKey, keyId: team.keyId });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[GET /api/workspace]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
