import { describe, expect, it } from "vitest";

import { en } from "@/lib/i18n/en";
import { hi } from "@/lib/i18n/hi";
import { LOCALES, LOCALE_NAMES, isLocale } from "@/lib/i18n/types";

const dictionaries: Record<string, Record<string, string>> = { en, hi };

describe("i18n dictionaries", () => {
  it("every locale has a display name", () => {
    for (const l of LOCALES) expect(LOCALE_NAMES[l]).toBeTruthy();
  });

  it.each(Object.keys(dictionaries))("%s has no missing keys vs English", (locale) => {
    const missing = Object.keys(en).filter((k) => !(k in dictionaries[locale]));
    expect(missing, `missing in ${locale}: ${missing.join(", ")}`).toEqual([]);
  });

  it.each(Object.keys(dictionaries))("%s has no stray keys not in English", (locale) => {
    const stray = Object.keys(dictionaries[locale]).filter((k) => !(k in en));
    expect(stray, `stray in ${locale}: ${stray.join(", ")}`).toEqual([]);
  });

  it.each(Object.keys(dictionaries))("%s has no empty strings", (locale) => {
    const empty = Object.entries(dictionaries[locale]).filter(([, v]) => !v.trim());
    expect(empty.map(([k]) => k)).toEqual([]);
  });

  it("placeholders match between English and every translation", () => {
    const ph = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(",");
    for (const [locale, dict] of Object.entries(dictionaries)) {
      for (const [key, value] of Object.entries(en)) {
        expect(ph(dict[key] ?? ""), `${locale}.${key} placeholder mismatch`).toBe(ph(value));
      }
    }
  });

  it("Hindi is actually translated, not copied English", () => {
    // A handful of brand/technical strings legitimately stay similar; the bulk
    // must differ, otherwise the translation was never really done.
    const identical = Object.keys(en).filter((k) => en[k] === hi[k]);
    expect(identical.length / Object.keys(en).length).toBeLessThan(0.1);
  });

  it("helpline-adjacent copy keeps Latin digits so numbers stay dialable", () => {
    const devanagariDigits = /[०-९]/;
    for (const [locale, dict] of Object.entries(dictionaries)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(devanagariDigits.test(value), `${locale}.${key} uses Devanagari digits`).toBe(false);
      }
    }
  });

  it("safety copy exists in every locale", () => {
    for (const [locale, dict] of Object.entries(dictionaries)) {
      for (const key of ["safety.withdrawalBody", "safety.notMedicalBody", "safety.crisisTitle"]) {
        expect(dict[key]?.length ?? 0, `${locale}.${key}`).toBeGreaterThan(20);
      }
    }
  });
});

describe("isLocale", () => {
  it("accepts supported locales and rejects anything else", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("hi")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
