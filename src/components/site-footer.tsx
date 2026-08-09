"use client";

import { useT } from "@/components/i18n-provider";

export function SiteFooter() {
  const t = useT();

  return (
    <footer className="mt-12 border-t border-border py-6 text-center text-xs text-subtle">
      <p>{t("footer.tagline")}</p>
      <nav aria-label="Footer" className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        <a href="/guide" className="underline underline-offset-2 hover:text-foreground">{t("footer.howItWorks")}</a>
        <span aria-hidden>&middot;</span>
        <a href="/faq" className="underline underline-offset-2 hover:text-foreground">{t("footer.faq")}</a>
        <span aria-hidden>&middot;</span>
        <a href="/support" className="font-medium text-sky-700 dark:text-sky-400 underline underline-offset-2 hover:text-sky-800 dark:hover:text-sky-300">{t("nav.support")}</a>
        <span aria-hidden>&middot;</span>
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">{t("footer.privacy")}</a>
        <span aria-hidden>&middot;</span>
        <a href="/terms" className="underline underline-offset-2 hover:text-foreground">{t("footer.terms")}</a>
      </nav>
      <p className="mt-2">{t("footer.disclaimer")}</p>
    </footer>
  );
}
