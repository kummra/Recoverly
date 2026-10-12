import { getLearnArticle, getLearnMeta, learnLastModified, listLearnArticles, type LearnSlug } from "@/content/learn";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { en } from "@/lib/i18n/en";
import type { Locale } from "@/lib/i18n/types";
import { BASE_URL, absoluteUrl } from "@/lib/seo/alternates";

/**
 * JSON-LD for search engines.
 *
 * Rendered from the dictionaries rather than a hand-kept copy, and in the
 * language of the page it sits on, so the markup cannot drift from what the
 * reader actually sees — Google
 * treats a mismatch between markup and visible content as a reason to drop the
 * rich result, and for a health topic that scrutiny is higher still.
 *
 * Emitted from server components only, so it costs nothing on the client.
 */
function Ld({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is our own literal content, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * The app itself. `isAccessibleForFree` is a genuine differentiator here.
 *
 * Deliberately stays English: this is site-level entity data rendered from the
 * root layout, which has no locale, and Google accepts one canonical
 * description per entity. Only page-content schemas are localised.
 */
export function AppStructuredData() {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Recoverly",
        url: BASE_URL,
        applicationCategory: "HealthApplication",
        operatingSystem: "Any (web browser)",
        description: en["home.heroBody"],
        inLanguage: ["en", "hi", "mr", "pa", "ta", "te", "kn", "ml", "gu"],
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        audience: {
          "@type": "Audience",
          audienceType: "People reducing or quitting alcohol"
        },
        // Being explicit that this is not a medical service is both honest and
        // exactly what Google's health-content guidance looks for.
        disambiguatingDescription: en["safety.notMedicalBody"]
      }}
    />
  );
}

const FAQ_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** FAQPage markup — the one schema here eligible for a rich result. */
export function FaqStructuredData({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ_NUMBERS.map((n) => ({
          "@type": "Question",
          name: t(`faq.q${n}`),
          acceptedAnswer: { "@type": "Answer", text: t(`faq.a${n}`) }
        }))
      }}
    />
  );
}

/** The step-by-step guide, marked up as a HowTo. */
export function GuideStructuredData({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: t("guide.title"),
        description: t("guide.intro"),
        step: [1, 2, 3, 4, 5, 6].map((n) => ({
          "@type": "HowToStep",
          name: t(`guide.step${n}Title`),
          text: t(`guide.step${n}Body`)
        }))
      }}
    />
  );
}

/** Home > Guides (> one guide), so a result can show where the page sits. */
function learnBreadcrumb(locale: Locale, slug?: LearnSlug) {
  const t = createTranslator(locale);
  const trail = [
    { name: "Recoverly", url: absoluteUrl(locale, "") },
    { name: t("learn.hubTitle"), url: absoluteUrl(locale, "learn") }
  ];
  if (slug) trail.push({ name: getLearnArticle(locale, slug).title, url: absoluteUrl(locale, `learn/${slug}`) });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

/** The Learn index: the list of guides, in the language of the page. */
export function LearnHubStructuredData({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  return (
    <>
      <Ld
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: t("learn.hubTitle"),
          description: t("learn.hubIntro"),
          url: absoluteUrl(locale, "learn"),
          inLanguage: locale,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: listLearnArticles(locale).map(({ slug, article }, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: article.title,
              url: absoluteUrl(locale, `learn/${slug}`)
            }))
          }
        }}
      />
      <Ld data={learnBreadcrumb(locale)} />
    </>
  );
}

/**
 * One guide, as a plain `Article`.
 *
 * Deliberately not `MedicalWebPage`, and with no `reviewedBy`: nobody with a
 * medical qualification has reviewed these, and markup must not claim an
 * authority the page does not have. What is true is stated instead — who
 * publishes it, when the facts were last checked, and which public-health
 * pages it was written from (`citation`).
 */
export function ArticleStructuredData({ locale, slug }: { locale: Locale; slug: LearnSlug }) {
  const article = getLearnArticle(locale, slug);
  const meta = getLearnMeta(slug);
  const url = absoluteUrl(locale, `learn/${slug}`);
  const recoverly = { "@type": "Organization", name: "Recoverly", url: BASE_URL };
  return (
    <>
      <Ld
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.description,
          url,
          mainEntityOfPage: url,
          inLanguage: locale,
          datePublished: meta.published,
          dateModified: learnLastModified(slug),
          isAccessibleForFree: true,
          image: `${BASE_URL}/opengraph-image`,
          author: recoverly,
          publisher: recoverly,
          citation: meta.sources.map((source) => ({
            "@type": "WebPage",
            name: source.title,
            url: source.url,
            publisher: { "@type": "Organization", name: source.publisher }
          }))
        }}
      />
      <Ld data={learnBreadcrumb(locale, slug)} />
    </>
  );
}
