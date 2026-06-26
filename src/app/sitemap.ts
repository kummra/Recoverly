import type { MetadataRoute } from "next";

const BASE_URL = "https://recoverly-app.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // Public, indexable pages only. Per-user app screens are excluded (see robots.ts).
  const routes = [
    { path: "", priority: 1 },
    { path: "guide", priority: 0.8 },
    { path: "support", priority: 0.8 },
    { path: "faq", priority: 0.7 },
    { path: "login", priority: 0.5 },
    { path: "privacy", priority: 0.3 },
    { path: "terms", priority: 0.3 }
  ];

  return routes.map((route) => ({
    url: route.path ? `${BASE_URL}/${route.path}` : BASE_URL,
    lastModified,
    changeFrequency: "monthly",
    priority: route.priority
  }));
}
