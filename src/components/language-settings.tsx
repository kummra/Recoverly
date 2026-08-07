"use client";

import { Check, Languages } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOCALES, LOCALE_ENGLISH_NAMES, LOCALE_NAMES } from "@/lib/i18n/types";

/**
 * Language chooser for Settings.
 *
 * Each option is written in its own script, with the English name beneath —
 * someone who can't yet read the interface still needs to find their language,
 * and someone who only reads their own script shouldn't have to parse English.
 */
export function LanguageSettings() {
  const { locale, setLocale, t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Languages className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          {t("common.language")}
        </CardTitle>
        <CardDescription>
          Choose the language for the app. Your choice is remembered on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("common.language")}>
          {LOCALES.map((l) => {
            const selected = l === locale;
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setLocale(l)}
                lang={l}
                className={`flex min-h-11 flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors ${
                  selected
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-border hover:bg-surface"
                }`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className={`text-sm ${selected ? "font-medium text-foreground" : "text-body"}`}>
                    {LOCALE_NAMES[l]}
                  </span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />}
                </span>
                <span className="text-[11px] text-subtle">{LOCALE_ENGLISH_NAMES[l]}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
