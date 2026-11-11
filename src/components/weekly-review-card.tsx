"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type WeeklyReview, reviewMessage } from "@/lib/weekly-review";

const MESSAGE_KEYS = { all: "week.msgAll", some: "week.msgSome", none: "week.msgNone" } as const;

/**
 * The last seven days at a glance (see `lib/weekly-review.ts` for the rules it
 * keeps: nothing scored, nothing red, an honest count for a short history).
 *
 * The row of dots is decoration for people who read at a glance; the sentence
 * above it carries the same information for everyone, including screen readers
 * and anyone who cannot tell the colours apart. A drink day is amber, not red,
 * and is drawn as a hollow ring beside the filled alcohol-free days, so it is
 * distinguishable by shape.
 */
export function WeeklyReviewCard({ review }: { review: WeeklyReview }) {
  const t = useT();
  const kind = reviewMessage(review);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("week.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Green is for days to be glad of. After a hard week the number is shown plainly, not as a prize. */}
        <p className={`text-2xl font-bold ${kind === "none" ? "text-foreground" : "text-emerald-700 dark:text-emerald-300"}`}>
          {t("week.freeDays", { n: review.alcoholFreeDays, total: review.days.length })}
        </p>

        <ul className="flex gap-1.5" aria-hidden>
          {review.days.map((day) => (
            <li
              key={day.date.getTime()}
              className={
                day.free
                  ? "h-3.5 w-3.5 rounded-full bg-emerald-500"
                  : "h-3.5 w-3.5 rounded-full border-2 border-amber-500 bg-transparent"
              }
            />
          ))}
        </ul>

        <p className="text-sm leading-relaxed text-body">{t(MESSAGE_KEYS[kind])}</p>

        {review.cravings.total > 0 && (
          <p className="text-sm text-body">
            {t("cravings.riddenOut", { passed: review.cravings.passed, total: review.cravings.total })}
          </p>
        )}

        {/* A week with no drinks logged would read "0 check-ins", which sounds like nagging; say nothing. */}
        {review.checkIns > 0 && <p className="text-xs text-subtle">{t("week.checkIns", { n: review.checkIns })}</p>}

        {/* After a hard week the useful next step is a plan, not more numbers. */}
        {kind === "none" && (
          <Link
            href="/settings"
            className="inline-block rounded text-sm font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-sky-300 dark:hover:text-sky-200"
          >
            {t("plan.makeOne")}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
