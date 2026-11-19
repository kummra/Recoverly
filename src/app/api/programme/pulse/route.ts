import { NextRequest, NextResponse } from "next/server";

import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { directory } from "@/lib/org/server";
import { firestorePulseStore } from "@/lib/programme-pulse-firestore";
import { recordPulse } from "@/lib/programme-pulse-service";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getUserIdFromRequest } from "@/lib/server-auth";

export const runtime = "nodejs";

/** An answer is `{"code":"ACMELOGI26","answer":4}`. */
const MAX_BODY_BYTES = 300;

/**
 * One anonymous answer to the monthly question: add one to a programme's count for this month and that answer. That is all it does.
 *
 * Like the monthly tick, the request is signed in only so that a count cannot be faked by anyone with a script; the person's id is used
 * for that and for the rate limit, in memory, and is never stored, logged with the code, or kept in any list (see `lib/programme-pulse.ts`
 * for the design and `privacy.s17Body` for what is promised to people). The code travels in the body, not the address, so it is not
 * in a URL log. Only a programme that offers the survey accepts an answer; any other answers "not found".
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) return NextResponse.json({ error: "unavailable" }, { status: 503 });

    const uid = await getUserIdFromRequest(request);
    if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const limited = rateLimit(`programme-pulse:${uid}`, LIMITS.programmePulse.limit, LIMITS.programmePulse.windowMs);
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
    const fields = body as { code?: unknown; answer?: unknown };

    const result = await recordPulse(firestorePulseStore(adminDb), await directory.findProgramme(fields.code), new Date(), fields.answer);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, month: result.month });
  } catch (error) {
    // The message only: never the code, the answer, or who sent it.
    // eslint-disable-next-line no-console
    console.error("[POST /api/programme/pulse]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
