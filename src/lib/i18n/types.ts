export const LOCALES = ["en", "hi", "mr", "pa", "ta", "te", "kn", "ml", "gu"] as const;
export type Locale = (typeof LOCALES)[number];

/** Endonyms — a language picker should name each language in its own script. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
  pa: "ਪੰਜਾਬੀ",
  ta: "தமிழ்",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  gu: "ગુજરાતી"
};

/** English names, for the accessible label and for anyone who can't read the script. */
export const LOCALE_ENGLISH_NAMES: Record<Locale, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  pa: "Punjabi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  gu: "Gujarati"
};

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Flat key → string. Flat (not nested) so a missing key is obvious at a glance. */
export type Dictionary = Record<string, string>;
