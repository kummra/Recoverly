import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LEARN_CATALOGS,
  LEARN_LOCALES,
  LEARN_SLUGS,
  getLearnArticle,
  getLearnMeta,
  type LearnArticle,
  type LearnBlock,
  type LearnLocale
} from "@/content/learn";
import { LOCALES } from "@/lib/i18n/types";
import { HELPLINES } from "@/lib/safety";

/** Published translations. Empty while only English is published. */
const TRANSLATED: LearnLocale[] = LEARN_LOCALES.filter((l) => l !== "en");

/** Every string a reader sees in one guide, with a label saying where it is. */
function strings(article: LearnArticle): Array<[string, string]> {
  const out: Array<[string, string]> = [
    ["title", article.title],
    ["description", article.description],
    ["summary", article.summary]
  ];
  article.keyPoints.forEach((point, i) => out.push([`keyPoints[${i}]`, point]));
  article.sections.forEach((section, s) => {
    out.push([`sections[${s}].heading`, section.heading]);
    section.blocks.forEach((block, b) => {
      const at = `sections[${s}].blocks[${b}]`;
      if (block.type === "p") out.push([at, block.text]);
      if (block.type === "list") block.items.forEach((item, i) => out.push([`${at}.items[${i}]`, item]));
      if (block.type === "callout") out.push([`${at}.title`, block.title], [`${at}.text`, block.text]);
    });
  });
  return out;
}

/** The shape of a guide with the words taken out. */
function shape(article: LearnArticle) {
  const blockShape = (block: LearnBlock) =>
    block.type === "list" ? `list:${block.items.length}` : block.type === "callout" ? `callout:${block.tone}` : "p";
  return {
    keyPoints: article.keyPoints.length,
    sections: article.sections.map((section) => section.blocks.map(blockShape))
  };
}

const allText = (article: LearnArticle) => strings(article).map(([, text]) => text).join("\n");

describe("learn guides: English", () => {
  for (const slug of LEARN_SLUGS) {
    const article = LEARN_CATALOGS.en[slug];
    const text = allText(article);

    it(`${slug}: fits the limits search results and readers impose`, () => {
      expect(article.title.length).toBeLessThanOrEqual(65);
      expect(article.description.length).toBeGreaterThanOrEqual(110);
      expect(article.description.length).toBeLessThanOrEqual(160);
      expect(article.summary.length).toBeLessThanOrEqual(220);
      expect(article.keyPoints.length).toBeGreaterThanOrEqual(3);
      expect(article.sections.length).toBeGreaterThanOrEqual(4);
    });

    it(`${slug}: does not shame the reader`, () => {
      // "alcoholic" is fine as an adjective for a drink, never as a name for a person.
      expect(text).not.toMatch(/\b(an?|the|recovering)\s+alcoholic\b(?!\s+(drink|beverage))/i);
      expect(text).not.toMatch(/\b(alcoholics|addicts?|drunkards?|abusers?|junkies?)\b/i);
    });

    it(`${slug}: gives no medical instructions (project rule 1)`, () => {
      // Naming a medicine or a dose is the line between information and advice.
      expect(text).not.toMatch(
        /\b(diazepam|chlordiazepoxide|lorazepam|oxazepam|librium|valium|disulfiram|antabuse|naltrexone|acamprosate|baclofen|benzodiazepines?)\b/i
      );
      expect(text).not.toMatch(/\b\d+\s?(mg|milligrams?)\b/i);
    });

    it(`${slug}: tells the reader where to get help`, () => {
      expect(text.includes(HELPLINES.india.teleManas) || text.includes(HELPLINES.india.emergency)).toBe(true);
    });

    it(`${slug}: is plain text`, () => {
      for (const [where, value] of strings(article)) {
        expect(value, where).not.toMatch(/<[a-z/][^>]*>|\*\*|\]\(|https?:\/\//i);
      }
    });
  }

  it("carries the stop-suddenly warning wherever a guide talks about stopping (project rule 3)", () => {
    const mustWarn = [
      "stopping-alcohol-safely",
      "understanding-audit-score",
      "after-a-drinking-slip",
      "helping-someone-who-drinks"
    ] as const;
    for (const slug of mustWarn) {
      const warnings = LEARN_CATALOGS.en[slug].sections
        .flatMap((section) => section.blocks)
        .filter((block) => block.type === "callout" && block.tone === "warning");
      expect(warnings.length, slug).toBeGreaterThan(0);
      expect(allText(LEARN_CATALOGS.en[slug]), slug).toMatch(/doctor/i);
    }
  });
});

describe("learn guides: translations", () => {
  it("has a catalog for exactly the published languages, each with every guide", () => {
    expect(Object.keys(LEARN_CATALOGS).sort()).toEqual([...LEARN_LOCALES].sort());
    for (const locale of LEARN_LOCALES) {
      expect(Object.keys(LEARN_CATALOGS[locale]).sort(), locale).toEqual([...LEARN_SLUGS].sort());
    }
  });

  it("publishes only in languages the app has, with English always among them", () => {
    expect(LEARN_LOCALES).toContain("en");
    for (const locale of LEARN_LOCALES) expect(LOCALES).toContain(locale);
  });

  it("gives a reader of an unpublished language the English guide, not a blank", () => {
    for (const locale of LOCALES) {
      const expected = (LEARN_LOCALES as readonly string[]).includes(locale) ? locale : "en";
      expect(getLearnArticle(locale, LEARN_SLUGS[0])).toBe(LEARN_CATALOGS[expected as LearnLocale][LEARN_SLUGS[0]]);
    }
  });

  for (const locale of TRANSLATED) {
    for (const slug of LEARN_SLUGS) {
      const english = LEARN_CATALOGS.en[slug];
      const translated = LEARN_CATALOGS[locale][slug];

      it(`${locale}/${slug}: has the same structure as the English guide`, () => {
        // A dropped block is how a safety warning silently goes missing.
        expect(shape(translated)).toEqual(shape(english));
      });

      it(`${locale}/${slug}: is translated, not copied or left blank`, () => {
        const en = strings(english);
        const tr = strings(translated);
        for (let i = 0; i < en.length; i++) {
          expect(tr[i][1].trim(), tr[i][0]).not.toBe("");
          // Anything longer than a short label must differ from the English.
          if (en[i][1].length > 25) expect(tr[i][1], tr[i][0]).not.toBe(en[i][1]);
        }
      });

      it(`${locale}/${slug}: keeps every number, in digits a phone can dial`, () => {
        const en = strings(english);
        const tr = strings(translated);
        for (let i = 0; i < en.length; i++) {
          // No Devanagari, Gurmukhi, Gujarati, Tamil, Telugu, Kannada or Malayalam numerals.
          expect(tr[i][1], tr[i][0]).not.toMatch(/[०-९੦-੯૦-૯௦-௯౦-౯೦-೯൦-൯]/);
          // A helpline, a threshold or a time limit that changes in translation
          // is the most dangerous kind of translation error there is.
          const digits = (value: string) => value.replace(/[,  ]/g, "").match(/\d+/g) ?? [];
          const have = digits(tr[i][1]);
          for (const number of digits(en[i][1])) expect(have, `${tr[i][0]} is missing ${number}`).toContain(number);
        }
      });
    }
  }
});

describe("learn guides: sources and metadata", () => {
  /** Public bodies and primary literature only. Adding a host here is a
   *  decision about what this site is willing to cite on a health topic. */
  const TRUSTED_HOSTS =
    /(^|\.)(who\.int|paho\.org|nih\.gov|medlineplus\.gov|nhs\.uk|nice\.org\.uk|gov\.in|drugsandalcohol\.ie)$/;

  for (const slug of LEARN_SLUGS) {
    const meta = getLearnMeta(slug);

    it(`${slug}: cites public-health sources over https`, () => {
      expect(meta.sources.length).toBeGreaterThanOrEqual(2);
      const urls = meta.sources.map((source) => source.url);
      expect(new Set(urls).size).toBe(urls.length);
      for (const source of meta.sources) {
        const url = new URL(source.url);
        expect(url.protocol, source.url).toBe("https:");
        expect(url.hostname, source.url).toMatch(TRUSTED_HOSTS);
        expect(source.title.trim()).not.toBe("");
        expect(source.publisher.trim()).not.toBe("");
      }
    });

    it(`${slug}: has real dates and related guides that exist`, () => {
      expect(meta.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(meta.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(meta.related).not.toContain(slug);
      for (const related of meta.related) expect(LEARN_SLUGS).toContain(related);
    });
  }
});

describe("learn guides: bundle", () => {
  function walk(dir: string, files: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, files);
      else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) files.push(full);
    }
    return files;
  }

  it("never reaches the browser as script", () => {
    // The guides are nine languages of long-form text. A client component that
    // imports them would add all of it to the JavaScript every visitor downloads.
    const offenders = walk(join(process.cwd(), "src")).filter((file) => {
      const source = readFileSync(file, "utf8");
      if (!/^\s*["']use client["']/.test(source)) return false;
      return /from\s+["']@\/content\/learn(?!\/types["'])/.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
