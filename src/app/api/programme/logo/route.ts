import { NextRequest } from "next/server";

import { directory } from "@/lib/org/server";
import { imageResponse } from "@/lib/org/route";
import { normaliseCode } from "@/lib/programme";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { callerKey } from "@/lib/request-guards";

export const runtime = "nodejs";

const NOT_FOUND = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * The logo of the programme a person has joined, drawn beside its name. Served from here so that nobody else's server learns who
 * looked at it, and answered like the lookup of the words: by programme code, for that code only, keeping nothing and counting
 * nothing. A programme with no logo, one that is not live, or one whose plan has no logos is a plain 404.
 */
export async function GET(request: NextRequest) {
  const caller = rateLimit(`programme:${callerKey(request)}`, LIMITS.programme.limit, LIMITS.programme.windowMs);
  if (!caller.allowed) return tooManyRequests(caller.retryAfter);
  const overall = rateLimit("programme:all", LIMITS.programmeAll.limit, LIMITS.programmeAll.windowMs);
  if (!overall.allowed) return tooManyRequests(overall.retryAfter);

  const code = normaliseCode(request.nextUrl.searchParams.get("code"));
  const logo = code ? await directory.findLogo(code) : null;
  // A short cache: a logo that changed or was taken down is gone from a phone within minutes.
  return logo ? imageResponse(logo, "public, max-age=300") : NOT_FOUND();
}
