/**
 * Where to send someone after they sign in, when a page asked for it with `?next=`. Only the organisation pages
 * may ask, and only for a path on this site: anything else (another site, a script address, a path that tries to
 * escape) is ignored and the person lands where they always would. A sign-in link that can be made to redirect
 * anywhere is a phishing tool.
 */
/** The portal, pricing and owner pages, or a page under /partners (letters, digits, hyphens and underscores only: no dots, so no `..`), then an optional query or fragment. */
const ALLOWED = /^\/(?:portal|pricing|owner|partners(?:\/[A-Za-z0-9_-]+)+)(?:[?#].*)?$/;

export function safeNextPath(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  return ALLOWED.test(value) ? value : null;
}

/** `/login?next=…` for a path that may be asked for, or plain `/login`. */
export function loginPathFor(next: string | null | undefined): string {
  const safe = safeNextPath(next);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}
