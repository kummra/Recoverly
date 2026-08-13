"use client";

import { useEffect } from "react";

import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n/types";

/**
 * Aligns the client-side locale with the one in the URL.
 *
 * The public pages render their copy on the server from the route's locale, but
 * the shared chrome — nav, footer — reads the stored preference. Without this,
 * someone arriving on /ta/support from a search result would get Tamil content
 * framed by English navigation.
 *
 * Visiting a language's URL is a clear enough signal of intent to treat it as a
 * preference, so it persists and the signed-in app follows suit.
 */
export function LocaleSync({ locale }: { locale: Locale }) {
  const { locale: current, setLocale } = useI18n();

  useEffect(() => {
    if (current !== locale) setLocale(locale);
  }, [current, locale, setLocale]);

  return null;
}
