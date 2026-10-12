import type { MetadataRoute } from "next";

import { LEARN_SLUGS, learnLastModified } from "@/content/learn";
import { BASE_URL, absoluteUrl, localesForRoute } from "@/lib/seo/alternates";

/**
 * Public, indexable pages only. Per-user app screens are excluded (see robots.ts).
 *
 * `lastModified` is a hand-maintained content date, not `new Date()`. Stamping
 * "now" on every route at build time told crawlers the whole site changed on
 * every deploy — including deploys that only touched app internals — which
 * makes the signal worthless. Bump a page's date when its copy actually changes.
 */
const CONTENT_UPDATED = "2026-08-11";
/** The sign-in page and the guide's first step were rewritten when phone
 *  sign-in was removed. */
const SIGN_IN_UPDATED = "2026-10-11";

type Route = {
  path: string;
  priority: number;
  changeFrequency: "monthly" | "yearly";
  lastModified: string;
};

/** Pages with language versions. The guides are listed only in the languages
 *  they are published in. */
const TRANSLATED: Route[] = [
  { path: "guide", priority: 0.8, changeFrequency: "monthly", lastModified: SIGN_IN_UPDATED },
  { path: "support", priority: 0.8, changeFrequency: "monthly", lastModified: CONTENT_UPDATED },
  { path: "faq", priority: 0.7, changeFrequency: "monthly", lastModified: CONTENT_UPDATED },
  { path: "privacy", priority: 0.3, changeFrequency: "yearly", lastModified: CONTENT_UPDATED },
  { path: "terms", priority: 0.3, changeFrequency: "yearly", lastModified: CONTENT_UPDATED },
  // The Learn guides.
  {
    path: "learn",
    priority: 0.8,
    changeFrequency: "monthly",
    lastModified: LEARN_SLUGS.map(learnLastModified).sort().at(-1) ?? CONTENT_UPDATED
  },
  ...LEARN_SLUGS.map(
    (slug): Route => ({
      path: `learn/${slug}`,
      priority: 0.7,
      changeFrequency: "monthly",
      lastModified: learnLastModified(slug)
    })
  )
];

/** English-only routes: the app shell and the sign-in screen. */
const ENGLISH_ONLY: Route[] = [
  { path: "", priority: 1, changeFrequency: "monthly", lastModified: CONTENT_UPDATED },
  { path: "login", priority: 0.5, changeFrequency: "yearly", lastModified: SIGN_IN_UPDATED }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = ENGLISH_ONLY.map((route) => ({
    url: route.path ? `${BASE_URL}/${route.path}` : BASE_URL,
    lastModified: route.lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));

  // Each translation is listed as its own URL and carries the alternates for
  // the whole set, which is what lets Google serve the right language rather
  // than treating the nine versions as duplicates of one another.
  for (const route of TRANSLATED) {
    const locales = localesForRoute(route.path);
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(locale, route.path),
        lastModified: route.lastModified,
        changeFrequency: route.changeFrequency,
        // The English page stays the primary; translations sit just below it.
        priority: locale === "en" ? route.priority : Math.round((route.priority - 0.1) * 10) / 10,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, absoluteUrl(l, route.path)]))
        }
      });
    }
  }

  return entries;
}
