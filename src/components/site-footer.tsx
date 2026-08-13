"use client";

import { useT } from "@/components/i18n-provider";
import { LanguageLinks } from "@/components/language-links";

export function SiteFooter() {
  const t = useT();

  return (
    <footer className="mt-12 border-t border-border py-6 text-center text-xs text-subtle">
      <p>{t("footer.tagline")}</p>
      <nav aria-label="Footer" className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        <a href="/guide" className="rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("footer.howItWorks")}</a>
        <span aria-hidden>&middot;</span>
        <a href="/faq" className="rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("footer.faq")}</a>
        <span aria-hidden>&middot;</span>
        <a href="/support" className="rounded font-medium text-sky-700 dark:text-sky-400 underline underline-offset-2 hover:text-sky-800 dark:hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("nav.support")}</a>
        <span aria-hidden>&middot;</span>
        <a href="/privacy" className="rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("footer.privacy")}</a>
        <span aria-hidden>&middot;</span>
        <a href="/terms" className="rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("footer.terms")}</a>
      </nav>
      <LanguageLinks />
      <p className="mt-2">{t("footer.disclaimer")}</p>
    </footer>
  );
}
