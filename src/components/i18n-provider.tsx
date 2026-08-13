"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DICTIONARIES, translate } from "@/lib/i18n/dictionaries";
import { en } from "@/lib/i18n/en";
import { DEFAULT_LOCALE, type Locale, isLocale } from "@/lib/i18n/types";

const STORAGE_KEY = "recoverly:locale";

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate a key, interpolating `{placeholders}`. */
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Restore the saved choice after mount. Rendering the default first keeps
  // server and client markup identical, avoiding a hydration mismatch.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(saved)) setLocaleState(saved);
    } catch {
      /* storage unavailable — stay on the default */
    }
  }, []);

  // Keep <html lang> honest for screen readers and browser translation.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* not persisting is survivable */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTIONARIES[locale] ?? en;
    return { locale, setLocale, t: (key, vars) => translate(dict, key, vars) };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Returns `t` plus the current locale. Safe to call outside the provider
 * (falls back to English) so a stray component can never crash the page.
 */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return { locale: DEFAULT_LOCALE, setLocale: () => undefined, t: (k, v) => translate(en, k, v) };
}

export function useT() {
  return useI18n().t;
}
