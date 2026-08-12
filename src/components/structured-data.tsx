import { en } from "@/lib/i18n/en";

const BASE_URL = "https://recoverly-app.vercel.app";

/**
 * JSON-LD for search engines.
 *
 * Rendered from the English dictionary rather than a hand-kept copy, so the
 * structured data cannot drift away from what the page actually says — Google
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

/** The app itself. `isAccessibleForFree` is a genuine differentiator here. */
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
export function FaqStructuredData() {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ_NUMBERS.map((n) => ({
          "@type": "Question",
          name: en[`faq.q${n}`],
          acceptedAnswer: { "@type": "Answer", text: en[`faq.a${n}`] }
        }))
      }}
    />
  );
}

/** The step-by-step guide, marked up as a HowTo. */
export function GuideStructuredData() {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: en["guide.title"],
        description: en["guide.intro"],
        step: [1, 2, 3, 4, 5, 6].map((n) => ({
          "@type": "HowToStep",
          name: en[`guide.step${n}Title`],
          text: en[`guide.step${n}Body`]
        }))
      }}
    />
  );
}
