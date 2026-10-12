import { LEARN_LOCALES, isLearnLocale, isLearnSlug } from "@/content/learn/types";
import { LOCALES, type Locale } from "@/lib/i18n/types";

export const BASE_URL = "https://recoverly-app.vercel.app";

/** Locales that carry a URL prefix. English is served unprefixed so the URLs
 *  already indexed by Google keep working and never need a redirect. */
export const PREFIXED_LOCALES = LOCALES.filter((l) => l !== "en");

/** Pages that exist in all nine languages. Everything else (the signed-in app,
 *  the sign-in screen, the home page) is English-only. */
export const TRANSLATED_PAGES = ["guide", "support", "faq", "privacy", "terms"] as const;

function isLearnRoute(route: string): boolean {
  if (route === "learn") return true;
  const [section, slug, ...rest] = route.split("/");
  return section === "learn" && rest.length === 0 && isLearnSlug(slug);
}

/**
 * The languages a route (no leading slash, no locale prefix) exists in. Empty
 * for English-only pages. The Learn guides have their own, possibly shorter,
 * list: a translation of a health guide is published only once it has been
 * checked (see LEARN_LOCALES).
 */
export function localesForRoute(route: string): readonly Locale[] {
  if ((TRANSLATED_PAGES as readonly string[]).includes(route)) return LOCALES;
  if (isLearnRoute(route)) return LEARN_LOCALES;
  return [];
}

/** True for a route that has language versions at all. */
export function isTranslatedRoute(route: string): boolean {
  return localesForRoute(route).length > 0;
}

/** A link into the guides for a reader of `locale`: their own language if the
 *  guides are published in it, otherwise English. Never a page that 404s. */
export function learnPath(locale: Locale, slug?: string): string {
  return localisedPath(isLearnLocale(locale) ? locale : "en", slug ? `learn/${slug}` : "learn");
}

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
  // Only languages the page really exists in: an hreflang that points at a
  // missing page is worse than no hreflang.
  const published = localesForRoute(path.replace(/^\/+/, ""));
  for (const l of published.length ? published : LOCALES) languages[l] = absoluteUrl(l, path);
  languages["x-default"] = absoluteUrl("en", path);
  return { canonical: absoluteUrl(locale, path), languages };
}
