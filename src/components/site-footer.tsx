"use client";

import { usePathname } from "next/navigation";

import { useT } from "@/components/i18n-provider";
import { LanguageLinks } from "@/components/language-links";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { localisedPath } from "@/lib/seo/alternates";

/** The locale the current URL is in, so footer links keep the reader in it. */
function useRouteLocale(): Locale {
  const pathname = usePathname() ?? "/";
  const first = pathname.split("/").filter(Boolean)[0];
  return first && (LOCALES as readonly string[]).includes(first) ? (first as Locale) : "en";
}

const LINK =
  "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SiteFooter() {
  const t = useT();
  // Hardcoding /guide sent a Tamil reader back to English mid-journey, and left
  // each language's pages linking only into English rather than to each other.
  const locale = useRouteLocale();
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
