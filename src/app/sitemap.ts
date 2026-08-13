import type { MetadataRoute } from "next";

import { LOCALES } from "@/lib/i18n/types";
import { BASE_URL, absoluteUrl } from "@/lib/seo/alternates";

/**
 * Public, indexable pages only. Per-user app screens are excluded (see robots.ts).
 *
 * `lastModified` is a hand-maintained content date, not `new Date()`. Stamping
 * "now" on every route at build time told crawlers the whole site changed on
 * every deploy — including deploys that only touched app internals — which
 * makes the signal worthless. Bump a page's date when its copy actually changes.
 */
const CONTENT_UPDATED = "2026-08-11";

/** Pages that exist in all nine languages. */
const TRANSLATED = [
  { path: "guide", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "support", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "faq", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "terms", priority: 0.3, changeFrequency: "yearly" as const }
];

/** English-only routes: the app shell and the sign-in screen. */
const ENGLISH_ONLY = [
  { path: "", priority: 1, changeFrequency: "monthly" as const },
  { path: "login", priority: 0.5, changeFrequency: "yearly" as const }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = ENGLISH_ONLY.map((route) => ({
    url: route.path ? `${BASE_URL}/${route.path}` : BASE_URL,
    lastModified: CONTENT_UPDATED,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));

  // Each translation is listed as its own URL and carries the alternates for
  // the whole set, which is what lets Google serve the right language rather
  // than treating the nine versions as duplicates of one another.
  for (const route of TRANSLATED) {
    for (const locale of LOCALES) {
      entries.push({
        url: absoluteUrl(locale, route.path),
        lastModified: CONTENT_UPDATED,
        changeFrequency: route.changeFrequency,
        // The English page stays the primary; translations sit just below it.
        priority: locale === "en" ? route.priority : Math.round((route.priority - 0.1) * 10) / 10,
        alternates: {
          languages: Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(l, route.path)]))
        }
      });
    }
  }

  return entries;
}
