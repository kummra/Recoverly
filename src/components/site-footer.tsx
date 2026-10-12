"use client";

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
      </nav>
      <LanguageLinks />
      <p className="mt-2">{t("footer.disclaimer")}</p>
    </footer>
  );
}
