/**
 * Small checks shared by the public routes (the ones that have no sign-in).
 * Free of server-only imports so they can be unit tested.
 */

/** The only handle on an anonymous caller. Used in memory for the rate limit
 *  and never stored or logged. */
export function callerKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Browsers attach the page's origin to a cross-site request, so a page on
 * another site cannot post here on someone's behalf. Clients that send no
 * origin (curl, scripts) are held back by the rate limit instead.
 */
export function fromOurOwnPages(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host")];
  return hosts.includes(originHost);
}
