import type { MetadataRoute } from "next";

const BASE_URL = "https://recoverly-app.vercel.app";

/**
 * Public, indexable pages only. Per-user app screens are excluded (see robots.ts).
 *
 * `lastModified` is a hand-maintained content date, not `new Date()`. Stamping
 * "now" on every route at build time told crawlers the whole site changed on
 * every deploy — including deploys that only touched app internals — which
 * makes the signal worthless. Bump a page's date when its copy actually changes.
 */
const CONTENT_UPDATED = "2026-08-11";

const routes = [
  { path: "", priority: 1, changeFrequency: "monthly" as const },
  { path: "guide", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "support", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "faq", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "login", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "terms", priority: 0.3, changeFrequency: "yearly" as const }
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: route.path ? `${BASE_URL}/${route.path}` : BASE_URL,
    lastModified: CONTENT_UPDATED,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
