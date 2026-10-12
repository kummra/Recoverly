/**
 * The Learn guides: long-form, plain-language articles on the public site.
 *
 * They live here rather than in the i18n dictionaries on purpose. The
 * dictionaries are imported by the client-side provider, so every string in
 * them ships to every visitor in all nine languages. Six articles times nine
 * languages would add hundreds of kilobytes of script to pages that never show
 * them. These modules are only ever imported by server components, so the copy
 * reaches the browser as HTML and nothing else. `learn.test.ts` fails if a
 * client component starts importing from this folder.
 */

import type { Locale } from "@/lib/i18n/types";

/**
 * The languages the guides are published in.
 *
 * This is deliberately its own list rather than "every language the app has".
 * A guide tells people when to call an ambulance; a translation of it is only
 * published once it has been independently checked against the English. A
 * language is added here in the same change that adds its catalog file, and
 * until then its readers are sent to the English guide rather than to a page
 * that does not exist or has not been checked.
 */
export const LEARN_LOCALES = ["en", "hi", "mr", "gu"] as const satisfies readonly Locale[];
export type LearnLocale = (typeof LEARN_LOCALES)[number];

export function isLearnLocale(value: unknown): value is LearnLocale {
  return typeof value === "string" && (LEARN_LOCALES as readonly string[]).includes(value);
}

/** Order here is the order on the hub page. Slugs are shared by every language
 *  so a reader switching language lands on the same guide. */
export const LEARN_SLUGS = [
  "stopping-alcohol-safely",
  "understanding-audit-score",
  "standard-drink-india",
  "coping-with-alcohol-cravings",
  "after-a-drinking-slip",
  "helping-someone-who-drinks"
] as const;

export type LearnSlug = (typeof LEARN_SLUGS)[number];

export function isLearnSlug(value: unknown): value is LearnSlug {
  return typeof value === "string" && (LEARN_SLUGS as readonly string[]).includes(value);
}

export type LearnBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  /** `warning` is reserved for safety-critical text, such as the risk of
   *  stopping suddenly; it is rendered so it cannot be skimmed past. */
  | { type: "callout"; tone: "warning" | "info"; title: string; text: string };

export type LearnSection = { heading: string; blocks: LearnBlock[] };

export type LearnArticle = {
  /** Page heading and <title>. */
  title: string;
  /** Meta description. */
  description: string;
  /** Standfirst, also shown on the hub card. */
  summary: string;
  /** What a reader should take away if they read nothing else. */
  keyPoints: string[];
  sections: LearnSection[];
};

export type LearnCatalog = Record<LearnSlug, LearnArticle>;

export type LearnSource = { title: string; publisher: string; url: string };

/** Facts about a guide that do not change with language. */
export type LearnMeta = {
  /** ISO dates. `reviewed` is when the facts were last checked against the
   *  sources, and is what readers and search engines are shown. */
  published: string;
  reviewed: string;
  /** The public-health pages each guide was written from. Left in the language
   *  they were published in: a translated title would not match the page. */
  sources: LearnSource[];
  related: LearnSlug[];
};
