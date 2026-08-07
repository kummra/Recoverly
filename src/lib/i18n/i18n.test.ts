import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { en } from "@/lib/i18n/en";
import { gu } from "@/lib/i18n/gu";
import { hi } from "@/lib/i18n/hi";
import { kn } from "@/lib/i18n/kn";
import { ml } from "@/lib/i18n/ml";
import { mr } from "@/lib/i18n/mr";
import { pa } from "@/lib/i18n/pa";
import { ta } from "@/lib/i18n/ta";
import { te } from "@/lib/i18n/te";
import { LOCALES, LOCALE_NAMES, isLocale } from "@/lib/i18n/types";

const dictionaries: Record<string, Record<string, string>> = { en, hi, mr, pa, ta, te, kn, ml, gu };

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

  it.each(Object.keys(dictionaries).filter((l) => l !== "en"))(
    "%s is actually translated, not copied English",
    (locale) => {
      // A few brand/technical strings legitimately stay similar; the bulk must
      // differ, otherwise the translation was never really done.
      const identical = Object.keys(en).filter((k) => en[k] === dictionaries[locale][k]);
      expect(identical.length / Object.keys(en).length).toBeLessThan(0.1);
    }
  );

  it("every declared locale has a dictionary", () => {
    for (const l of LOCALES) expect(dictionaries[l], `no dictionary for ${l}`).toBeTruthy();
  });

  it("helpline-adjacent copy keeps Latin digits so numbers stay dialable", () => {
    // Digits from every script we ship — a number you must dial has to stay Latin.
      const nonLatinDigits = /[०-९૦-૯੦-੯௦-௯౦-౯೦-೯൦-൯]/;
    for (const [locale, dict] of Object.entries(dictionaries)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(nonLatinDigits.test(value), `${locale}.${key} uses non-Latin digits`).toBe(false);
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

/** Concatenated source of every app file, excluding tests and the dictionaries. */
function appSource(): string {
  const parts: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(entry) || entry.includes(".test.")) continue;
      if (path.includes(join("lib", "i18n"))) continue;
      parts.push(readFileSync(path, "utf8"));
    }
  };
  walk(join(process.cwd(), "src"));
  return parts.join("\n");
}

describe("i18n wiring", () => {
  // A translated string nothing renders is invisible work: the dictionary looks
  // complete, the parity tests pass, and the screen still shows English.
  //
  // Matching the bare key literal rather than `t("key")` is deliberate — keys are
  // also referenced indirectly (e.g. `labelKey: "nav.home"` fed to `t(item.labelKey)`),
  // and a stricter check would flag those as orphans.
  it("every English key is referenced somewhere in the app", () => {
    const source = appSource();
    const orphaned = Object.keys(en).filter((k) => !source.includes(`"${k}"`));
    expect(orphaned, `keys defined but never rendered: ${orphaned.join(", ")}`).toEqual([]);
  });

  it("every literal t() call refers to a key that exists", () => {
    const calls = [...appSource().matchAll(/(?<![A-Za-z0-9_])t\(\s*"([^"]+)"/g)].map((m) => m[1]);
    const missing = [...new Set(calls)].filter((k) => !(k in en));
    expect(missing, `t() called with unknown keys: ${missing.join(", ")}`).toEqual([]);
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
