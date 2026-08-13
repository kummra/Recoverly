import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/types";
import { BASE_URL, absoluteUrl, alternatesFor, localisedPath } from "@/lib/seo/alternates";

describe("localised URLs", () => {
  it("leaves English unprefixed so already-indexed URLs never move", () => {
    expect(localisedPath("en", "faq")).toBe("/faq");
    expect(localisedPath("en", "")).toBe("/");
  });

  it("prefixes every other language", () => {
    expect(localisedPath("hi", "faq")).toBe("/hi/faq");
    expect(localisedPath("ta", "support")).toBe("/ta/support");
  });

  it("does not double up slashes", () => {
    expect(localisedPath("ml", "/guide")).toBe("/ml/guide");
    expect(absoluteUrl("ml", "/guide")).toBe(`${BASE_URL}/ml/guide`);
  });
});

describe("hreflang annotations", () => {
  const alts = alternatesFor("hi", "faq");

  it("declares every language plus x-default", () => {
    // Google ignores a one-way annotation, so each page names the whole set.
    for (const l of LOCALES) expect(alts.languages[l]).toBe(absoluteUrl(l, "faq"));
    expect(Object.keys(alts.languages)).toHaveLength(LOCALES.length + 1);
  });

  it("points x-default at English", () => {
    expect(alts.languages["x-default"]).toBe(`${BASE_URL}/faq`);
  });

  it("canonicalises each translation to itself, not to English", () => {
    // Pointing a translation's canonical at English would tell Google to drop it.
    expect(alts.canonical).toBe(`${BASE_URL}/hi/faq`);
    expect(alternatesFor("en", "faq").canonical).toBe(`${BASE_URL}/faq`);
  });

  it("is reciprocal — English names the translations too", () => {
    const fromEnglish = alternatesFor("en", "faq");
    expect(fromEnglish.languages.hi).toBe(alts.languages.hi);
  });
});
