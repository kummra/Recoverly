"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import { LanguageLinks } from "@/components/language-links";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { isTranslatedRoute, learnPath, localisedPath } from "@/lib/seo/alternates";

/**
 * Which language the footer's links should lead to.
 *
 * - On a translated page (/ta/faq): its language, so the reader stays in it.
 * - On an English content page (/faq): English, so the English pages link to
 *   one another and not at random into other languages.
 * - Anywhere else (the home page, the signed-in app): the reader's own chosen
 *   language. Those pages have no language in their URL, and sending someone
 *   who uses the app in Hindi to an English guide would be a step backwards.
 */
function useLinkLocale(preferred: Locale): Locale {
  const segments = (usePathname() ?? "/").split("/").filter(Boolean);
  const first = segments[0];
  if (first && (LOCALES as readonly string[]).includes(first)) return first as Locale;
  if (isTranslatedRoute(segments.join("/"))) return "en";
  return preferred;
}

const LINK =
  "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SiteFooter() {
  const { t, locale: preferred } = useI18n();
  const locale = useLinkLocale(preferred);
  const href = (route: string) => localisedPath(locale, route);

  return (
    <footer className="mt-12 border-t border-border py-6 text-center text-xs text-subtle">
      <p>{t("footer.tagline")}</p>
      <nav aria-label="Footer" className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        <a href={href("guide")} className={LINK}>
          {t("footer.howItWorks")}
        </a>
        <span aria-hidden>&middot;</span>
        <a href={href("faq")} className={LINK}>
          {t("footer.faq")}
        </a>
        <span aria-hidden>&middot;</span>
        <a href={learnPath(locale)} className={LINK}>
          {t("learn.navLabel")}
        </a>
        <span aria-hidden>&middot;</span>
        <a
          href={href("support")}
          className={`rounded font-medium text-sky-700 dark:text-sky-400 underline underline-offset-2 hover:text-sky-800 dark:hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
          {t("nav.support")}
        </a>
        <span aria-hidden>&middot;</span>
        <a href={href("privacy")} className={LINK}>
          {t("footer.privacy")}
        </a>
        <span aria-hidden>&middot;</span>
        <a href={href("terms")} className={LINK}>
          {t("footer.terms")}
        </a>
        <span aria-hidden>&middot;</span>
        {/* English only, like the page itself: for the people who would sign a pilot. */}
        <Link href="/partners" className={LINK}>
          {t("footer.organisations")}
        </Link>
        <span aria-hidden>&middot;</span>
        <a href={`${href("privacy")}#contact`} className={LINK}>
          {t("footer.contact")}
        </a>
      </nav>
      <div className="mx-auto mt-4 max-w-3xl space-y-2 border-t border-border pt-4 text-left sm:text-center">
        <p className="font-medium text-muted-foreground">All pages</p>
        <nav aria-label="App pages" className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <Link href="/" className={LINK}>
            {t("nav.home")}
          </Link>
          <Link href="/login" className={LINK}>
            {t("nav.login")}
          </Link>
          <Link href="/dashboard" className={LINK}>
            {t("nav.dashboard")}
          </Link>
          <Link href="/records" className={LINK}>
            {t("nav.records")}
          </Link>
          <Link href="/assessment" className={LINK}>
            {t("nav.assessment")}
          </Link>
          <Link href="/ai" className={LINK}>
            {t("nav.ai")}
          </Link>
          <Link href="/report" className={LINK}>
            {t("report.title")}
          </Link>
          <Link href="/settings" className={LINK}>
            {t("nav.settings")}
          </Link>
          <a href={learnPath(locale)} className={LINK}>
            {t("learn.navLabel")}
          </a>
        </nav>
        {/* The organisation pages are English only, like the rest of that part of the site. */}
        <nav aria-label="Organisation pages" lang="en" className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <span className="font-medium text-muted-foreground">Organisations:</span>
          <Link href="/partners" className={LINK}>
            Overview and enquiry
          </Link>
          <Link href="/partners/toolkit" className={LINK}>
            Toolkit
          </Link>
          <Link href="/partners/toolkit/poster" className={LINK}>
            Poster maker
          </Link>
          <Link href="/partners/toolkit/session-outline" className={LINK}>
            Session outline
          </Link>
          <Link href="/partners/toolkit/manager-guide" className={LINK}>
            Manager guide
          </Link>
          <Link href="/join/SAMPLE" className={LINK}>
            Try a programme code (SAMPLE)
          </Link>
          <Link href="/partners/report/example" className={LINK}>
            Example monthly report
          </Link>
          <Link href="/partners/workspace/example" className={LINK}>
            Example team workspace
          </Link>
          <Link href="/partners/toolkit/campaigns" className={LINK}>
            Campaign kit
          </Link>
          <Link href="/partners/toolkit/disclosure-protocol" className={LINK}>
            Disclosure protocol
          </Link>
          <Link href="/partners/toolkit/help-a-friend" className={LINK}>
            Help-a-friend guide
          </Link>
          <Link href="/partners/toolkit/orientation" className={LINK}>
            Orientation pack
          </Link>
          <Link href="/partners/toolkit/clinic-handout" className={LINK}>
            Clinic handout
          </Link>
          <Link href="/partners/pilot" className={LINK}>
            Pilot kit
          </Link>
          <Link href="/partners/faq" className={LINK}>
            Organisation FAQ
          </Link>
          <Link href="/partners/compliance" className={LINK}>
            Compliance checklist
          </Link>
          <Link href="/partners/regional" className={LINK}>
            Regional partners
          </Link>
          <Link href="/trust" className={LINK}>
            Trust and security
          </Link>
          <Link href="/press" className={LINK}>
            Fact sheet
          </Link>
          <Link href="/accessibility" className={LINK}>
            Accessibility
          </Link>
          <Link href="/embed/help" className={LINK}>
            Help card for websites
          </Link>
          {/* A data file, not a page: a plain link so the browser opens it directly. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/helplines" className={LINK}>
            Helplines data (JSON)
          </a>
        </nav>
      </div>
      <LanguageLinks />
      <p className="mt-2">{t("footer.disclaimer")}</p>
    </footer>
  );
}
