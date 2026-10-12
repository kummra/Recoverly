import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LearnArticleView } from "@/components/learn-article";
import { ArticleStructuredData } from "@/components/structured-data";
import { LEARN_SLUGS, getLearnArticle, getLearnMeta, isLearnSlug, learnLastModified } from "@/content/learn";
import { absoluteUrl, alternatesFor } from "@/lib/seo/alternates";

/** One static page per guide. Unknown slugs are a 404, never a soft one. */
export function generateStaticParams() {
  return LEARN_SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isLearnSlug(slug)) return {};
  const article = getLearnArticle("en", slug);
  const meta = getLearnMeta(slug);
  return {
    title: article.title,
    description: article.description,
    alternates: alternatesFor("en", `learn/${slug}`),
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: absoluteUrl("en", `learn/${slug}`),
      publishedTime: meta.published,
      modifiedTime: learnLastModified(slug)
    }
  };
}

export default async function LearnArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isLearnSlug(slug)) notFound();
  return (
    <>
      <ArticleStructuredData locale="en" slug={slug} />
      <LearnArticleView locale="en" slug={slug} />
    </>
  );
}
