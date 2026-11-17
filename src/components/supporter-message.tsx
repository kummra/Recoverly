"use client";

import { useState } from "react";
import { Check, Copy, MessageSquareHeart } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShareFacts } from "@/lib/share";

/**
 * A short, kind progress update the person can edit, copy and send to someone who supports them, in their own
 * words and by their own app. Recoverly sends nothing: it only fills in a sentence from numbers already on this
 * page. No guilt, no streak-loss framing; the person may rewrite or delete any of it.
 */
export function SupporterMessage({ facts }: { facts: ShareFacts }) {
  const { t } = useI18n();
  const days = (n: number) => `${n} ${t(n === 1 ? "dashboard.dayUnit" : "dashboard.daysUnit")}`;
  const [text, setText] = useState(() =>
    t("report.supporterTemplate", {
      month: facts.monthMl,
      previous: facts.previousMonthMl,
      free: facts.freeDaysThisMonth,
      days: facts.daysThisMonth,
      streak: days(facts.currentStreakDays)
    })
  );
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="print:hidden" aria-labelledby="supporter-title">
      <CardHeader>
        <CardTitle id="supporter-title" className="flex items-center gap-2 text-base">
          <MessageSquareHeart className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("report.supporterTitle")}
        </CardTitle>
        <CardDescription className="leading-relaxed">{t("report.supporterIntro")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 600))}
          rows={5}
          maxLength={600}
          aria-labelledby="supporter-title"
          className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground focus:border-emerald-500/50 focus:outline-none"
        />
        <Button type="button" variant="outline" onClick={copy} className="gap-1.5">
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? t("report.supporterCopied") : t("report.supporterCopy")}
        </Button>
      </CardContent>
    </Card>
  );
}
