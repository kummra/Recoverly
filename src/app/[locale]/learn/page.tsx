import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LearnHub } from "@/components/learn-hub";
import { LearnHubStructuredData } from "@/components/structured-data";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { LEARN_LOCALES, isLearnLocale } from "@/content/learn";
import { alternatesFor } from "@/lib/seo/alternates";

/** One page per language the guides are published in; English stays unprefixed. */
export function generateStaticParams() {
  return LEARN_LOCALES.filter((locale) => locale !== "en").map((locale) => ({ locale }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLearnLocale(locale) || locale === "en") return {};
  const t = createTranslator(locale);
  return {
    title: t("learn.hubTitle"),
    description: t("learn.hubIntro"),
    alternates: alternatesFor(locale, "learn")
  };
}

export default async function LocalisedLearnPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // A language the guides are not published in yet has no page here.
  if (!isLearnLocale(locale) || locale === "en") notFound();
  return (
    <>
      <LearnHubStructuredData locale={locale} />
      <LearnHub locale={locale} />
    </>
  );
}
