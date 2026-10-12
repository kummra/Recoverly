import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LearnArticleView } from "@/components/learn-article";
import { ArticleStructuredData } from "@/components/structured-data";
import {
  LEARN_LOCALES,
  LEARN_SLUGS,
  getLearnArticle,
  getLearnMeta,
  isLearnLocale,
  isLearnSlug,
  learnLastModified
} from "@/content/learn";
import { absoluteUrl, alternatesFor } from "@/lib/seo/alternates";

/** Every guide in every language it is published in; English stays unprefixed. */
export function generateStaticParams() {
  return LEARN_LOCALES.filter((locale) => locale !== "en").flatMap((locale) =>
    LEARN_SLUGS.map((slug) => ({ locale, slug }))
  );
}

export const dynamicParams = false;

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLearnLocale(locale) || locale === "en" || !isLearnSlug(slug)) return {};
  const article = getLearnArticle(locale, slug);
  const meta = getLearnMeta(slug);
  return {
    title: article.title,
    description: article.description,
    alternates: alternatesFor(locale, `learn/${slug}`),
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: absoluteUrl(locale, `learn/${slug}`),
      publishedTime: meta.published,
      modifiedTime: learnLastModified(slug)
    }
  };
}

export default async function LocalisedLearnArticlePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLearnLocale(locale) || locale === "en" || !isLearnSlug(slug)) notFound();
  return (
    <>
      <ArticleStructuredData locale={locale} slug={slug} />
      <LearnArticleView locale={locale} slug={slug} />
    </>
  );
}
