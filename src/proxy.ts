import { NextResponse, type NextRequest } from "next/server";

import { directory } from "@/lib/org/server";

/**
 * Gives a wrong organisation-report address a real 404, and the same for a team-workspace address.
 *
 * `/partners/report/{key}` (and `/partners/workspace/{key}`, the same key) is a page that streams (the site has a root `loading.tsx`), and a
 * page that has started streaming has already sent "200", so its own `notFound()` can only
 * draw the not-found screen under a 200 status. Next's documented fix is to check before the
 * response starts, here. An address that is not a registered organisation's key is rewritten
 * to a path that does not exist, so Next answers with its own not-found page and a true 404;
 * a real key (and the public example) goes straight through. The page still checks the key
 * itself, so nothing depends on this file for safety: it is only about the status code.
 *
 * A real address whose organisation's plan has ended also goes through, so its page can say so.
 *
 * Proxy runs on Node, which is why it can use the register's constant-time key comparison and the
 * organisation database behind the directory.
 */
export async function proxy(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/");
  const segment = parts[3] ?? "";
  if (segment === "example") return NextResponse.next();
  let token = segment;
  try {
    token = decodeURIComponent(segment);
  } catch {
    /* a malformed escape cannot be a key: leave it as it is and it will not match */
  }
  // A team workspace needs more than a report key: the organisation must have one, and may.
  const found = parts[2] === "workspace" ? await directory.findWorkspaceByReportKey(token) : parts[2] === "group" ? await directory.findGroupByKey(token) : await directory.findProgrammeByReportKey(token);
  if (found) return NextResponse.next();
  if (await directory.findLapsedByKey(token)) return NextResponse.next();

  return NextResponse.rewrite(new URL("/report-key-not-found", request.url), { status: 404 });
}

export const config = { matcher: ["/partners/report/:token", "/partners/workspace/:token", "/partners/group/:token"] };
