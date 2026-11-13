import { NextRequest, NextResponse } from "next/server";

import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { firestoreCountStore } from "@/lib/programme-count-firestore";
import { recordTick } from "@/lib/programme-count-service";
import { findProgramme } from "@/lib/programme-register";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getUserIdFromRequest } from "@/lib/server-auth";

export const runtime = "nodejs";

/** A tick is `{"code":"ACMELOGI26"}`, plus `{"figures":{"month":"2026-10","freeDayPct":72,"lessThanBefore":true}}` if chosen. */
const MAX_BODY_BYTES = 800;

/**
 * The monthly "a person who chose to be counted used Recoverly" tick: add one to a
 * programme's total for this month. That is all it does.
 *
 * The request is signed in only so that a count cannot be faked by anyone with a
 * script; the person's id is used for that and for the rate limit, in memory, and is
 * never stored, logged with the code, or kept in any list (see
 * `lib/programme-count.ts` for the design and `privacy.s12Body` for what is promised
 * to people). The code travels in the body, not the address, so it is not in a URL log.
 *
 * Only a programme that has agreed to the headcount accepts a tick; any other answers
 * "not found". The sample programme accepts and stores nothing. If the person also chose
 * to share anonymous progress figures (and the programme offers them), two numbers about last
 * month ride along and are added into running sums; nothing about the person is kept.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) return NextResponse.json({ error: "unavailable" }, { status: 503 });

    const uid = await getUserIdFromRequest(request);
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const limited = rateLimit(`programme-count:${uid}`, LIMITS.programmeCount.limit, LIMITS.programmeCount.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "too-large" }, { status: 413 });
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const fields = typeof body === "object" && body !== null ? (body as { code?: unknown; figures?: unknown }) : {};

    const result = await recordTick(firestoreCountStore(adminDb), findProgramme(fields.code), new Date(), fields.figures);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, month: result.month });
  } catch (error) {
    // The message only: never the code, and never who sent it.
    // eslint-disable-next-line no-console
    console.error("[POST /api/programme/count]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
