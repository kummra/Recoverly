"use client";

import { usePathname } from "next/navigation";

import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/types";
import { localisedPath } from "@/lib/seo/alternates";

/** Pages that exist in every language. Everything else (the signed-in app,
 *  the sign-in screen) is English-only, so the picker stays hidden there
 *  rather than offering links that would 404. */
const TRANSLATED_ROUTES = ["guide", "support", "faq", "privacy", "terms"];

/** Split "/hi/faq" into its locale and the route beneath it. */
function parsePath(pathname: string): { locale: Locale; route: string } | null {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0] as Locale | undefined;
  const hasPrefix = maybeLocale ? (LOCALES as readonly string[]).includes(maybeLocale) : false;

  const locale: Locale = hasPrefix ? (maybeLocale as Locale) : "en";
  const route = (hasPrefix ? segments.slice(1) : segments).join("/");

  return TRANSLATED_ROUTES.includes(route) ? { locale, route } : null;
}

/**
 * Real anchors between the language versions of the current page.
 *
 * Two reasons this is links rather than a dropdown that sets state. Someone
 * arriving on /ta/faq from a search result needs a visible way to change
 * language, and crawlers follow anchors — a client-side switcher would leave
 * the translations reachable only through the sitemap.
 *
 * The signed-in app still uses the stored preference; language lives in the
 * URL only for the public pages, where search engines need to see it.
 */
export function LanguageLinks() {
  const pathname = usePathname();
  const parsed = parsePath(pathname ?? "/");
  if (!parsed) return null;

  return (
    <nav
      aria-label="Language"
      className="mt-3 flex flex-wrap justify-center gap-x-2 gap-y-1 text-xs"
    >
      {LOCALES.map((l) =>
        l === parsed.locale ? (
          <span key={l} aria-current="true" className="font-medium text-foreground">
            {LOCALE_NAMES[l]}
          </span>
        ) : (
          <a
            key={l}
            href={localisedPath(l, parsed.route)}
            lang={l}
            hrefLang={l}
            className="rounded text-subtle underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LOCALE_NAMES[l]}
          </a>
        )
      )}
    </nav>
  );
}
