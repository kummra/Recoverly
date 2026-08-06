"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { en } from "@/lib/i18n/en";
import { gu } from "@/lib/i18n/gu";
import { hi } from "@/lib/i18n/hi";
import { kn } from "@/lib/i18n/kn";
import { ml } from "@/lib/i18n/ml";
import { mr } from "@/lib/i18n/mr";
import { pa } from "@/lib/i18n/pa";
import { ta } from "@/lib/i18n/ta";
import { te } from "@/lib/i18n/te";
import { DEFAULT_LOCALE, type Dictionary, type Locale, isLocale } from "@/lib/i18n/types";

const DICTIONARIES: Record<Locale, Dictionary> = { en, hi, mr, pa, ta, te, kn, ml, gu };
const STORAGE_KEY = "recoverly:locale";

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate a key, interpolating `{placeholders}`. */
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function translate(dict: Dictionary, key: string, vars?: Record<string, string | number>): string {
  // Fall back to English, then to the key itself — a visible key in the UI is a
  // far better failure than a blank space.
  const template = dict[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

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
