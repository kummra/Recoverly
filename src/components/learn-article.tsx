import { BookOpen, ChevronLeft, ExternalLink, Info, ListChecks, ShieldAlert } from "lucide-react";

import { getLearnArticle, getLearnMeta, type LearnBlock, type LearnSlug } from "@/content/learn";
import { MedicalDisclaimer } from "@/components/safety-notice";
import { Card, CardContent } from "@/components/ui/card";
import { createTranslator } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { localisedPath } from "@/lib/seo/alternates";
import { cn } from "@/lib/utils";

const LINK =
  "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Latin digits in every language, matching how the rest of the app prints
 *  numbers; Marathi and Gujarati would otherwise switch to their own numerals. */
function formatReviewed(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(`${locale}-IN`, {
    dateStyle: "long",
    numberingSystem: "latn",
    timeZone: "UTC"
  }).format(new Date(`${iso}T00:00:00Z`));
}

function Block({ block }: { block: LearnBlock }) {
  if (block.type === "p") {
    return <p className="text-base leading-relaxed text-body">{block.text}</p>;
  }
  if (block.type === "list") {
    return (
      <ul className="list-disc space-y-1.5 pl-5 text-base leading-relaxed text-body">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  const warning = block.tone === "warning";
  const Icon = warning ? ShieldAlert : Info;
  return (
    <div
      role="note"
      className={cn(
        "rounded-2xl border p-4 leading-relaxed",
        warning ? "border-amber-500/40 bg-amber-500/5" : "border-sky-500/30 bg-sky-500/5"
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 text-base font-semibold",
          warning ? "text-amber-700 dark:text-amber-300" : "text-sky-700 dark:text-sky-300"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {block.title}
      </p>
      <p className="mt-2 text-sm text-body">{block.text}</p>
    </div>
  );
}

/**
 * One Learn guide, rendered entirely on the server in the language of its URL.
 */
export function LearnArticleView({ locale, slug }: { locale: Locale; slug: LearnSlug }) {
  const t = createTranslator(locale);
  const article = getLearnArticle(locale, slug);
  const meta = getLearnMeta(slug);

  return (
    <article className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <a
        href={localisedPath(locale, "learn")}
        className={cn(LINK, "inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:underline")}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t("learn.allGuides")}
      </a>

      <header className="space-y-3">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{article.title}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">{article.summary}</p>
        <p className="text-xs text-subtle">
          {t("learn.reviewed", { date: formatReviewed(meta.reviewed, locale) })}
        </p>
        {locale !== "en" && (
          <p className="text-xs text-subtle">
            {t("learn.translatedNote")}{" "}
            <a href={localisedPath("en", `learn/${slug}`)} hrefLang="en" lang="en" className={LINK}>
              Read in English
            </a>
          </p>
        )}
      </header>

      <Card>
        <CardContent className="pt-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ListChecks className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            {t("learn.inShort")}
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-body">
            {article.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {article.sections.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h2 className="text-lg font-semibold leading-snug text-foreground">{section.heading}</h2>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}

      <MedicalDisclaimer locale={locale} />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">{t("learn.sources")}</h2>
        <p className="text-xs text-subtle">{t("learn.sourcesNote")}</p>
        <ul className="space-y-1.5 text-sm text-body">
          {meta.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" lang="en" className={LINK}>
                {source.title}
                <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden />
              </a>
              <span className="text-subtle"> · {source.publisher}</span>
            </li>
          ))}
        </ul>
      </section>

      {meta.related.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            {t("learn.related")}
          </h2>
          <ul className="space-y-1.5 text-sm">
            {meta.related.map((related) => (
              <li key={related}>
                <a href={localisedPath(locale, `learn/${related}`)} className={LINK}>
                  {getLearnArticle(locale, related).title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card>
        <CardContent className="space-y-2 pt-6">
          <h2 className="text-base font-semibold">{t("learn.appTitle")}</h2>
          <p className="text-sm leading-relaxed text-body">{t("learn.appBody")}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href={localisedPath(locale, "guide")} className={LINK}>
              {t("footer.howItWorks")}
            </a>
            <a href={localisedPath(locale, "support")} className={cn(LINK, "font-medium text-sky-700 dark:text-sky-400")}>
              {t("guide.needHelpNow")}
            </a>
          </p>
        </CardContent>
      </Card>
    </article>
  );
}
