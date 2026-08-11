"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Heart, X } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildTriggerInsights, dayKey, findUpcomingRisk } from "@/lib/analytics";
import type { DrinkRecord } from "@/lib/firestore";

const DISMISS_KEY = "recoverly:aheadDismissed";

/**
 * Uses the patterns the app already computes to offer support *before* a
 * stretch that has historically been harder, instead of only describing it
 * afterwards on the records page.
 *
 * The tone is the whole feature. It names the pattern as the user's own,
 * never claims they are going to drink, and leads with something to do. It
 * also has to be easy to silence: a prompt that cannot be dismissed stops
 * being support and becomes nagging, so a dismissal holds for the rest of the
 * day, in localStorage rather than on the server — nothing about someone's
 * risk windows needs to leave their device.
 */
export function LookingAhead({
  records,
  motivation
}: {
  records: DrinkRecord[];
  motivation?: string;
}) {
  const t = useT();
  const [dismissed, setDismissed] = useState(true); // assume dismissed until we've checked

  const risk = useMemo(() => findUpcomingRisk(buildTriggerInsights(records)), [records]);

  // Read after mount so server and client markup match.
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === dayKey());
    } catch {
      setDismissed(false); // storage unavailable — better to show it than to hide it
    }
  }, []);

  if (!risk || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, dayKey());
    } catch {
      /* not remembering the dismissal is survivable */
    }
  };

  return (
    <Card className="border-sky-500/25 bg-sky-50 dark:bg-sky-950/10">
      <CardContent className="flex items-start gap-3 pt-6">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-400" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t("ahead.title", { pattern: t(risk.labelKey) })}
          </p>
          <p className="text-sm leading-relaxed text-body">{t("ahead.body")}</p>

          {motivation && (
            <p className="flex items-start gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm italic text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200/80">
              <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {motivation}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-0.5">
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/ai">{t("ahead.planIntention")}</Link>
            </Button>
            {!motivation && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href="/settings">{t("ahead.reviewWhy")}</Link>
              </Button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("ahead.dismiss")}
          className="rounded-lg p-1 text-subtle transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
