import { NextResponse, type NextRequest } from "next/server";

import { findProgrammeByReportKey } from "@/lib/programme-register";

/**
 * Gives a wrong organisation-report address a real 404.
 *
 * `/partners/report/{key}` is a page that streams (the site has a root `loading.tsx`), and a
 * page that has started streaming has already sent "200", so its own `notFound()` can only
 * draw the not-found screen under a 200 status. Next's documented fix is to check before the
 * response starts, here. An address that is not a registered organisation's key is rewritten
 * to a path that does not exist, so Next answers with its own not-found page and a true 404;
 * a real key (and the public example) goes straight through. The page still checks the key
 * itself, so nothing depends on this file for safety: it is only about the status code.
 *
 * Proxy runs on Node, which is why it can use the register's constant-time key comparison.
 */
export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.split("/")[3] ?? "";
  if (segment === "example") return NextResponse.next();

  let token = segment;
  try {
    token = decodeURIComponent(segment);
  } catch {
    /* a malformed escape cannot be a key: leave it as it is and it will not match */
  }
  if (findProgrammeByReportKey(token)) return NextResponse.next();

  return NextResponse.rewrite(new URL("/report-key-not-found", request.url), { status: 404 });
}

export const config = { matcher: "/partners/report/:token" };
