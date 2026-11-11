"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, MessageCircle, Share2 } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

/**
 * Pass a page to someone who might need it, in the way most people in India
 * already share things: WhatsApp.
 *
 * On a phone the system share sheet opens, WhatsApp among its choices. Where
 * there is no share sheet (most desktops) the link is copied and a WhatsApp
 * link sits beside the button. It shares the page's address and a line of
 * plain text, and nothing about the person sharing: the wording says what the
 * page is, not who is sending it.
 */
export function ShareButton({ text, locale, className }: { text: string; locale?: Locale; className?: string }) {
  const { t: providerT } = useI18n();
  const t = useMemo(() => (locale ? createTranslator(locale) : providerT), [locale, providerT]);

  const [canShare, setCanShare] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    // The page's address without a query string or a #fragment: neither is
    // part of what should be passed on.
    const here = new URL(window.location.href);
    here.search = "";
    here.hash = "";
    setUrl(here.toString());
  }, []);

  const share = async () => {
    if (!url) return;
    if (canShare) {
      try {
        await navigator.share({ text, url });
      } catch {
        /* the sheet was closed: nothing to do */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked: the WhatsApp link beside the button still works */
    }
  };

  const whatsapp = url ? `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` : "";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button type="button" variant="outline" size="sm" onClick={share} disabled={!url} className="gap-1.5">
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Share2 className="h-3.5 w-3.5" aria-hidden />}
        {t("share.button")}
      </Button>
      {!canShare && whatsapp && (
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            {t("share.whatsapp")}
          </a>
        </Button>
      )}
      <span role="status" className="text-xs text-muted-foreground">
        {copied ? t("share.copied") : ""}
      </span>
    </div>
  );
}
