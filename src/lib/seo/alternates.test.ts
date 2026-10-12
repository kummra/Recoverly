import { describe, expect, it } from "vitest";

import { LEARN_LOCALES } from "@/content/learn/types";
import { LOCALES } from "@/lib/i18n/types";
import {
  BASE_URL,
  absoluteUrl,
  alternatesFor,
  isTranslatedRoute,
  learnPath,
  localesForRoute,
  localisedPath
} from "@/lib/seo/alternates";

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

describe("the Learn guides, which can be published in fewer languages", () => {
  it("lists a guide only in the languages it is published in", () => {
    expect(localesForRoute("learn")).toEqual(LEARN_LOCALES);
    expect(localesForRoute("learn/stopping-alcohol-safely")).toEqual(LEARN_LOCALES);
    expect(localesForRoute("faq")).toEqual(LOCALES);
  });

  it("does not treat an unknown guide or an app page as translated", () => {
    expect(isTranslatedRoute("learn/not-a-guide")).toBe(false);
    expect(isTranslatedRoute("learn/stopping-alcohol-safely/extra")).toBe(false);
    expect(isTranslatedRoute("dashboard")).toBe(false);
    expect(isTranslatedRoute("")).toBe(false);
  });

  it("never emits an hreflang for a language a guide does not exist in", () => {
    const alts = alternatesFor("en", "learn/stopping-alcohol-safely");
    expect(Object.keys(alts.languages).sort()).toEqual([...LEARN_LOCALES, "x-default"].sort());
  });

  it("sends a reader of an unpublished language to the English guide, never to a 404", () => {
    for (const locale of LOCALES) {
      const published = (LEARN_LOCALES as readonly string[]).includes(locale);
      const expected = published && locale !== "en" ? `/${locale}/learn` : "/learn";
      expect(learnPath(locale)).toBe(expected);
      expect(learnPath(locale, "after-a-drinking-slip")).toBe(`${expected}/after-a-drinking-slip`);
    }
  });
});
