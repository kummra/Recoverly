"use client";

import { Languages } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { LOCALES, LOCALE_NAMES, isLocale } from "@/lib/i18n/types";

/** Compact language picker for the nav. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("common.language")}</span>
      <Languages className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
      <select
        value={locale}
        onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-2xl border border-input bg-transparent py-0 pl-8 pr-3 text-sm text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
