import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FaqContent } from "@/components/faq-content";
import { FaqStructuredData } from "@/components/structured-data";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/types";
import { PREFIXED_LOCALES, alternatesFor } from "@/lib/seo/alternates";

/** Pre-render one page per translated language; English stays unprefixed. */
export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = createTranslator(locale);
  return {
    title: t("faq.title"),
    description: t("faq.intro").slice(0, 300),
    alternates: alternatesFor(locale, "faq")
  };
}

export default async function LocalisedFaqContentPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // dynamicParams is false, so this only guards against a bad build config.
  if (!isLocale(locale)) notFound();
  return (
    <>
      <FaqStructuredData locale={locale} />
      <FaqContent locale={locale} />
    </>
  );
}
