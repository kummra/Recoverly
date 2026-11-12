import { NextRequest, NextResponse } from "next/server";

import { buildHelplineCard, parseLang } from "@/lib/helplines";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { callerKey } from "@/lib/request-guards";

export const runtime = "nodejs";

/** Public on purpose: other sites and apps read it from the browser. */
const CORS = { "Access-Control-Allow-Origin": "*" } as const;

/**
 * The national helplines as JSON, in any of the nine languages: `?lang=hi`.
 * Nothing personal goes in or out, and nothing is kept. See `lib/helplines.ts`
 * for what it is for and the rule about which numbers may appear.
 */
export async function GET(request: NextRequest) {
  const caller = rateLimit(`helplines:${callerKey(request)}`, LIMITS.helplines.limit, LIMITS.helplines.windowMs);
  if (!caller.allowed) return tooManyRequests(caller.retryAfter);

  const card = buildHelplineCard(parseLang(request.nextUrl.searchParams.get("lang")));
  // Not cached by us: the blanket no-store rule for /api in next.config applies, and it
  // is not worth an exception. A partner calling this from its own server should keep
  // the answer for an hour (the numbers change rarely) rather than ask on every visit.
  return NextResponse.json(card, { headers: CORS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Max-Age": "86400" } });
}
