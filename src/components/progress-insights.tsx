"use client";

import { useMemo } from "react";
import { Award, IndianRupee, Lightbulb, Trophy } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMilestones, buildSavings, buildTriggerInsights } from "@/lib/analytics";
import type { DrinkRecord } from "@/lib/firestore";

/**
 * The "why it's worth it" layer: what abstaining has given back, what's been
 * achieved, and what the data quietly says about their patterns.
 *
 * Tone rules: savings compare against their own heaviest month (so the number
 * can only ever be a gain), milestones credit the personal best even after a
 * reset, and trigger insights are framed as self-knowledge — never a warning.
 */
export function ProgressInsights({
  records,
  currentStreakDays,
  longestStreakDays
}: {
  records: DrinkRecord[];
  currentStreakDays: number;
  longestStreakDays: number;
}) {
  const t = useT();
  const savings = useMemo(() => buildSavings(records), [records]);
  const { milestones, next, daysToNext } = useMemo(
    () => buildMilestones(currentStreakDays, longestStreakDays),
    [currentStreakDays, longestStreakDays]
  );
  const triggers = useMemo(() => buildTriggerInsights(records), [records]);

  const reached = milestones.filter((m) => m.reached);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {savings.hasBaseline && (savings.rupeesSaved > 0 || savings.kcalAvoided > 0) && (
        <Card className="border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t("progress.gotBack")}
            </CardTitle>
            <CardDescription>
              {t("progress.gotBackDesc", { month: savings.baselineMonth ?? "" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  ₹{savings.rupeesSaved.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground">{t("progress.notSpent")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {savings.kcalAvoided.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground">{t("progress.caloriesAvoided")}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-subtle">
              {t("progress.estimateNote")}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            {t("progress.milestones")}
          </CardTitle>
          <CardDescription>
            {next
              ? daysToNext && daysToNext > 0
                ? t("progress.milestonesProgress", {
                    reached: reached.length,
                    remaining: t(daysToNext === 1 ? "progress.dayCount" : "progress.daysCount", {
                      n: daysToNext
                    }),
                    next: t(next.labelKey, { days: next.days })
                  })
                : t("progress.milestonesNext", {
                    reached: reached.length,
                    next: t(next.labelKey, { days: next.days })
                  })
              : t("progress.allReached")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {milestones.map((m) => (
              <span
                key={m.days}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  m.reached
                    ? "border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200"
                    : "border-border text-subtle"
                }`}
              >
                {m.reached && <Award className="h-3 w-3" aria-hidden />}
                {t(m.labelKey, { days: m.days })}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {triggers.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              {t("progress.patterns")}
            </CardTitle>
            <CardDescription>{t("progress.patternsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {triggers.map((insight) => (
                <li key={insight.labelKey} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-body">
                    {t("progress.clusterAround")}{" "}
                    <span className="font-medium">
                      {t(insight.labelKey, insight.mood ? { mood: insight.mood } : undefined)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-subtle tabular-nums">
                    {Math.round(insight.share * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
