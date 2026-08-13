import { createTranslator } from "@/lib/i18n/dictionaries";
import { en } from "@/lib/i18n/en";
import type { Locale } from "@/lib/i18n/types";

const BASE_URL = "https://recoverly-app.vercel.app";

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
