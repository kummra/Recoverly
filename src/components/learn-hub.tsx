import { ArrowRight, BookOpen } from "lucide-react";

import { listLearnArticles } from "@/content/learn";
import { Card, CardContent } from "@/components/ui/card";
import { createTranslator } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { localisedPath } from "@/lib/seo/alternates";

/** The index of Learn guides, server-rendered in the language of its URL. */
export function LearnHub({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          {t("learn.hubTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("learn.hubIntro")}</p>
      </div>

      <ul className="space-y-4">
        {listLearnArticles(locale).map(({ slug, article }) => (
          <li key={slug}>
            <Card>
              <CardContent className="space-y-2 pt-6">
                <h2 className="text-base font-semibold leading-snug">
                  <a
                    href={localisedPath(locale, `learn/${slug}`)}
                    className="rounded hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {article.title}
                  </a>
                </h2>
                <p className="text-sm leading-relaxed text-body">{article.summary}</p>
                <a
                  href={localisedPath(locale, `learn/${slug}`)}
                  aria-hidden
                  tabIndex={-1}
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {t("learn.readGuide")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
