import { LOCALES, type Locale } from "@/lib/i18n/types";

export const BASE_URL = "https://recoverly-app.vercel.app";

/** Locales that carry a URL prefix. English is served unprefixed so the URLs
 *  already indexed by Google keep working and never need a redirect. */
export const PREFIXED_LOCALES = LOCALES.filter((l) => l !== "en");

export function localisedPath(locale: Locale, path: string): string {
  const clean = path.replace(/^\/+/, "");
  const prefix = locale === "en" ? "" : `/${locale}`;
  return clean ? `${prefix}/${clean}` : prefix || "/";
}

export function absoluteUrl(locale: Locale, path: string): string {
  return `${BASE_URL}${localisedPath(locale, path)}`;
}

/**
 * hreflang for one page across every language it exists in.
 *
 * This is the signal Google actually uses for language targeting, so each
 * translation has to declare the whole set — including itself — plus an
 * `x-default` pointing at English for anyone whose language we don't publish.
 * Every page also gets a self-canonical, so the translations are understood as
 * alternates of one another rather than duplicates competing for the same query.
 */
export function alternatesFor(locale: Locale, path: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = absoluteUrl(l, path);
  languages["x-default"] = absoluteUrl("en", path);
  return { canonical: absoluteUrl(locale, path), languages };
}
