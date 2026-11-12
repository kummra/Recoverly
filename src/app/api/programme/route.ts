import { NextRequest, NextResponse } from "next/server";

import { normaliseCode } from "@/lib/programme";
import { findProgramme } from "@/lib/programme-register";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { callerKey } from "@/lib/request-guards";

export const runtime = "nodejs";

/**
 * Look up one programme by its code and answer with what its people are meant to
 * see: the organisation's name, its welcome and its support contacts.
 *
 * Public (a person scanning a poster has no account yet) and deliberately dull:
 * it takes a code, answers for that code only, never lists, and keeps nothing.
 * It does not record who asked or how often, and no one is told. Do not add a
 * counter or a log of lookups without changing the promise the app makes to the
 * people who use a code (`programme.private`, `privacy.s12*`).
 */
export async function GET(request: NextRequest) {
  const caller = rateLimit(`programme:${callerKey(request)}`, LIMITS.programme.limit, LIMITS.programme.windowMs);
  if (!caller.allowed) return tooManyRequests(caller.retryAfter);
  const overall = rateLimit("programme:all", LIMITS.programmeAll.limit, LIMITS.programmeAll.windowMs);
  if (!overall.allowed) return tooManyRequests(overall.retryAfter);

  const code = normaliseCode(request.nextUrl.searchParams.get("code"));
  if (!code) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const programme = findProgramme(code);
  if (!programme) return NextResponse.json({ error: "not-found" }, { status: 404 });

  return NextResponse.json({ programme });
}
