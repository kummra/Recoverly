import { NextRequest } from "next/server";

import { buildHelplineCard, parseLang } from "@/lib/helplines";
import { EMBED_CSP, parseTheme, renderHelplineEmbed } from "@/lib/helplines-embed";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { callerKey } from "@/lib/request-guards";

export const runtime = "nodejs";

/**
 * The help card other sites put in an iframe: `/embed/help?lang=ta&theme=dark`.
 * A route handler rather than a page, so it is one small document with no app
 * around it (no navigation, no footer, no scripts, no sign-in, no storage).
 * See `lib/helplines-embed.ts` for why it may be framed and nothing else may.
 */
export async function GET(request: NextRequest) {
  const caller = rateLimit(`helplines:${callerKey(request)}`, LIMITS.helplines.limit, LIMITS.helplines.windowMs);
  if (!caller.allowed) return tooManyRequests(caller.retryAfter);

  const params = request.nextUrl.searchParams;
  const html = renderHelplineEmbed(buildHelplineCard(parseLang(params.get("lang"))), { theme: parseTheme(params.get("theme")) });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": EMBED_CSP,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Robots-Tag": "noindex"
    }
  });
}
