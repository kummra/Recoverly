import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import PressPage from "@/app/press/page";
import { AppStructuredData } from "@/components/structured-data";
import { LEARN_SLUGS, getLearnArticle } from "@/content/learn";
import { RECOGNITION, RECOGNITION_SENTENCE } from "@/lib/recognition";
import { HELPLINES } from "@/lib/safety";
import { BASE_URL, PREFIXED_LOCALES } from "@/lib/seo/alternates";
import { HOME_FAQ, HOME_FEATURES, HOME_GUIDES } from "@/lib/seo/home-content";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("the address search engines should use", () => {
  it("sends the old Vercel address to the real domain, permanently, and leaves /api alone", async () => {
    const config = (await import(/* @vite-ignore */ pathToFileURL(path.join(root, "next.config.mjs")).href)).default;
    const rules = await config.redirects();
    const rule = rules.find((r: { has?: { value: string }[] }) => r.has?.some((h) => h.value === "recoverly-app.vercel.app"));
    expect(rule).toBeDefined();
    expect(rule.permanent).toBe(true);
    expect(rule.destination).toBe("https://recoverly.co.in/:path");
    // A cron job or webhook set up against the old address must not be redirected.
    expect(rule.source).toContain("(?!api/)");
  });

  it("sends a bare language address (/hi, /ml ...) to the home page, and nothing else", async () => {
    const config = (await import(/* @vite-ignore */ pathToFileURL(path.join(root, "next.config.mjs")).href)).default;
    const rules: { source: string; destination: string; permanent: boolean }[] = await config.redirects();
    const rule = rules.find((r) => r.destination === "/");
    expect(rule, "no redirect to the home page").toBeDefined();
    // Temporary: a translated home page at /hi may be built later, and a permanent redirect is cached for good.
    expect(rule?.permanent).toBe(false);
    // Use the router's own matcher, so this checks what Next will really do with the pattern.
    const { match } = createRequire(import.meta.url)("next/dist/compiled/path-to-regexp") as {
      match: (pattern: string) => (pathname: string) => unknown;
    };
    const matches = match(rule?.source ?? "");
    for (const locale of PREFIXED_LOCALES) expect(matches(`/${locale}`), `/${locale} should redirect`).toBeTruthy();
    // Pages that really exist, a look-alike, English (which has no prefix) and the home page itself must be left alone.
    for (const other of ["/", "/en", "/hindi", "/hi/learn", "/hi/support", "/learn", "/support"]) {
      expect(matches(other), `${other} must not redirect`).toBeFalsy();
    }
  });
});

describe("files that prove the site is ours", () => {
  it("serves the Search Console verification file from public/, where Next can serve it", () => {
    expect(read("public/google5cd4881e39b007ef.html")).toBe("google-site-verification: google5cd4881e39b007ef.html");
  });

  it("has exactly one IndexNow key file whose name and contents match", () => {
    const keyFiles = readdirSync(path.join(root, "public")).filter((name) => /^[a-f0-9]{32}\.txt$/.test(name));
    expect(keyFiles).toHaveLength(1);
    expect(read(`public/${keyFiles[0]}`).trim()).toBe(keyFiles[0].replace(".txt", ""));
  });
});

describe("the sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("lists the home page, every English guide and the support page", () => {
    expect(urls).toContain(BASE_URL);
    for (const slug of LEARN_SLUGS) expect(urls).toContain(`${BASE_URL}/learn/${slug}`);
    expect(urls).toContain(`${BASE_URL}/support`);
  });

  it("leaves out the sign-in form", () => {
    expect(urls).not.toContain(`${BASE_URL}/login`);
  });

  it("never lists a page that robots.txt blocks", () => {
    const rules = robots().rules;
    const disallow = (Array.isArray(rules) ? rules[0].disallow : rules.disallow) as string[];
    for (const url of urls) {
      const pathname = new URL(url).pathname;
      for (const blocked of disallow) expect(pathname.startsWith(blocked), `${pathname} is blocked by ${blocked}`).toBe(false);
    }
  });
});

describe("the home page's own words", () => {
  it("lists the six guides with their real titles", () => {
    expect(HOME_GUIDES.map((g) => g.slug).sort()).toEqual([...LEARN_SLUGS].sort());
    for (const guide of HOME_GUIDES) expect(guide.title).toBe(getLearnArticle("en", guide.slug).title);
  });

  it("prints the helpline numbers the app really uses", () => {
    const medical = HOME_FAQ.find((item) => item.question.includes("medical advice"));
    expect(medical?.answer).toContain(HELPLINES.india.teleManas);
    expect(medical?.answer).toContain(HELPLINES.india.emergency);
  });

  it("gives the home and support pages titles that say what they are", () => {
    const layout = read("src/app/layout.tsx");
    const title = layout.match(/default:\s*"([^"]+)"/)?.[1] ?? "";
    const description = layout.match(/description:\s*\n\s*"([^"]+)"/)?.[1] ?? "";
    expect(title.toLowerCase()).toContain("alcohol");
    // Past about 60 characters a search result cuts the title off.
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThan(80);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(read("src/app/support/page.tsx")).toContain(HELPLINES.india.teleManas);
  });
});

describe("structured data", () => {
  const blocks = [...renderToStaticMarkup(AppStructuredData()).matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1])
  );
  const byType = (type: string) => blocks.find((b) => b["@type"] === type);

  it("describes the organisation, the website and the app", () => {
    expect(byType("Organization")).toBeDefined();
    expect(byType("WebSite")).toBeDefined();
    expect(byType("WebApplication")).toBeDefined();
  });

  it("lists as features exactly what the home page says the app does", () => {
    expect(byType("WebApplication").featureList).toEqual([...HOME_FEATURES]);
  });

  it("states the recognition in the same words as the fact sheet, which links the competition's page", () => {
    expect(byType("Organization").award).toBe(RECOGNITION_SENTENCE);
    const page = renderToStaticMarkup(PressPage());
    expect(page).toContain(RECOGNITION.result);
    expect(page).toContain(RECOGNITION.url);
  });

  it("claims no ratings, reviews or clinical review it does not have", () => {
    const text = JSON.stringify(blocks);
    for (const forbidden of ["aggregateRating", "review", "reviewedBy"]) expect(text).not.toContain(forbidden);
  });
});
