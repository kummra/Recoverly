import type { MetadataRoute } from "next";

const BASE_URL = "https://recoverly-app.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, per-user areas — no value in indexing, and they require auth anyway.
      disallow: ["/dashboard", "/records", "/settings", "/ai", "/api/"]
    },
    sitemap: `${BASE_URL}/sitemap.xml`
  };
}
