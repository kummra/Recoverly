import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TermsContent } from "@/components/terms-content";
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
    title: t("terms.title"),
    description: t("terms.s1Body").slice(0, 300),
    alternates: alternatesFor(locale, "terms")
  };
}

export default async function LocalisedTermsContentPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // dynamicParams is false, so this only guards against a bad build config.
  if (!isLocale(locale)) notFound();
  return (
    <>
      <TermsContent locale={locale} />
    </>
  );
}
