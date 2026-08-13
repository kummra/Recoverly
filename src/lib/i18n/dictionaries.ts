import { en } from "@/lib/i18n/en";
import { gu } from "@/lib/i18n/gu";
import { hi } from "@/lib/i18n/hi";
import { kn } from "@/lib/i18n/kn";
import { ml } from "@/lib/i18n/ml";
import { mr } from "@/lib/i18n/mr";
import { pa } from "@/lib/i18n/pa";
import { ta } from "@/lib/i18n/ta";
import { te } from "@/lib/i18n/te";
import { DEFAULT_LOCALE, type Dictionary, type Locale } from "@/lib/i18n/types";

/**
 * The dictionary registry, importable from server components.
 *
 * It lives here rather than inside the client provider so a page can render
 * translated copy on the server. That matters for more than tidiness: the
 * localised routes must ship real Hindi or Tamil in the initial HTML. If the
 * text only appeared after hydration, a crawler would see English at every
 * URL and treat the translations as duplicates of the English page.
 */
export const DICTIONARIES: Record<Locale, Dictionary> = { en, hi, mr, pa, ta, te, kn, ml, gu };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

/** Look a key up, falling back to English and then to the key itself — a
 *  visible key in the UI is a far better failure than a blank space. */
export function translate(
  dict: Dictionary,
  key: string,
  vars?: Record<string, string | number>
): string {
  const template = dict[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/** Bind a dictionary so server components get the same `t(key, vars)` shape
 *  that client components get from `useT()`. */
export function createTranslator(locale: Locale): Translator {
  const dict = getDictionary(locale);
  return (key, vars) => translate(dict, key, vars);
}
