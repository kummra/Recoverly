import type { Locale } from "@/lib/i18n/types";

import { en } from "./en";
import { gu } from "./gu";
import { hi } from "./hi";
import { kn } from "./kn";
import { ml } from "./ml";
import { mr } from "./mr";
import { pa } from "./pa";
import { ta } from "./ta";
import { te } from "./te";
import { LEARN_META } from "./meta";
import {
  LEARN_SLUGS,
  isLearnLocale,
  type LearnArticle,
  type LearnCatalog,
  type LearnLocale,
  type LearnMeta,
  type LearnSlug
} from "./types";

/** One catalog per published language. Adding a language means adding its
 *  file, its entry here and its code in LEARN_LOCALES, together. */
export const LEARN_CATALOGS: Record<LearnLocale, LearnCatalog> = { en, hi, mr, pa, ta, te, kn, ml, gu };

/** A language the guides are not published in yet gets the English guide. */
export function getLearnArticle(locale: Locale, slug: LearnSlug): LearnArticle {
  return LEARN_CATALOGS[isLearnLocale(locale) ? locale : "en"][slug];
}

export function getLearnMeta(slug: LearnSlug): LearnMeta {
  return LEARN_META[slug];
}

/**
 * When a guide last changed, for search engines. The facts can be checked
 * before the page is published (they were, by a day), and a page cannot have
 * been modified before it existed, so this is the later of the two dates. The
 * date shown to readers is always `reviewed`.
 */
export function learnLastModified(slug: LearnSlug): string {
  const { published, reviewed } = LEARN_META[slug];
  return reviewed > published ? reviewed : published;
}

/** Every guide in hub order, for the index page and the sitemap. */
export function listLearnArticles(locale: Locale): Array<{ slug: LearnSlug; article: LearnArticle }> {
  return LEARN_SLUGS.map((slug) => ({ slug, article: getLearnArticle(locale, slug) }));
}

export { LEARN_LOCALES, LEARN_SLUGS, isLearnLocale, isLearnSlug } from "./types";
export type { LearnArticle, LearnBlock, LearnLocale, LearnMeta, LearnSection, LearnSlug, LearnSource } from "./types";
