"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { useAuth } from "@/hooks/use-auth";
import { HOME_FAQ, HOME_FEATURES, HOME_GUIDES } from "@/lib/seo/home-content";

const LINK =
  "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Plain text about what Recoverly is, below the signed-out home page.
 *
 * Before this, the home page said only "You are building a healthier identity":
 * kind, but it never named alcohol, India, the languages or the guides, so a
 * search engine had almost nothing to match against what people type. This is
 * the same promise, written the way a person would ask for it.
 *
 * Shown only to someone who is signed out and reading in English. It is
 * rendered on the server too, so a crawler sees it, and what a crawler sees is
 * exactly what an English-reading visitor sees (no hidden text). The words
 * come from `lib/seo/home-content.ts`, which the structured data also reads.
 * Other languages have their own pages (the guides, support, FAQ and the
 * policy are all translated); this block is not translated yet.
 */
export function HomeAbout() {
  const { locale } = useI18n();
  const { user } = useAuth();
  if (locale !== "en" || user) return null;

  return (
    <section aria-labelledby="home-about-title" className="space-y-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="space-y-3">
        <h2 id="home-about-title" className="text-xl font-semibold">
          A free, private app to cut down or quit alcohol
        </h2>
        <p className="text-sm leading-relaxed text-body sm:text-base">
          Recoverly is a free web app for people in India who want to drink less or stop. It is private by design, works in any
          browser, can be installed on a phone like an app, and is available in English, Hindi, Marathi, Punjabi, Tamil, Telugu,
          Kannada, Malayalam and Gujarati. It is a support tool, not medical care. If you drink heavily every day, see a doctor
          before you stop, because stopping suddenly can be dangerous.{" "}
          <Link href="/guide" className={LINK}>
            See how it works
          </Link>
          .
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">What you can do in Recoverly</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-body sm:text-base">
          {HOME_FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Guides to read first</h2>
        <p className="text-sm leading-relaxed text-body sm:text-base">
          Plain-language guides, each with the public-health sources it was checked against. You do not need an account to read them.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-body sm:text-base">
          {HOME_GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link href={`/learn/${guide.slug}`} className={LINK}>
                {guide.title}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-body sm:text-base">
          <Link href="/learn" className={LINK}>
            All the guides
          </Link>
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Safe, private and never medical advice</h2>
        <p className="text-sm leading-relaxed text-body sm:text-base">
          Help is always one tap away: Tele-MANAS (14416) and the emergency number 112 are on the{" "}
          <Link href="/support" className={LINK}>
            Support and helplines
          </Link>{" "}
          page. Recoverly has no advertising and does not sell data, and an organisation that offers it cannot see who uses it. Read
          the{" "}
          <Link href="/privacy" className={LINK}>
            privacy policy
          </Link>{" "}
          or how{" "}
          <Link href="/trust" className={LINK}>
            people are protected
          </Link>
          .
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Questions people ask</h2>
        <dl className="space-y-4">
          {HOME_FAQ.map((item) => (
            <div key={item.question}>
              <dt className="text-sm font-semibold sm:text-base">{item.question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-body sm:text-base">{item.answer}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-body sm:text-base">
          More answers are on the{" "}
          <Link href="/faq" className={LINK}>
            FAQ page
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
