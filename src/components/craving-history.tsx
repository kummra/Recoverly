"use client";

import { Waves } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildCravingSummary } from "@/lib/analytics";
import type { CravingEvent } from "@/lib/firestore";

/**
 * Every SOS session already records intensity, outcome and how long it took —
 * and until now only the clinician report ever read it. Showing it back is the
 * app's own evidence, from the user's own history, that the thing Craving SOS
 * tells them ("cravings rise, peak and pass") is true for *them* specifically.
 *
 * Framed entirely around what they got through. The count of episodes that
 * ended in a drink is deliberately not given its own figure: the useful,
 * non-shaming number is how many they rode out.
 */
export function CravingHistory({ events }: { events: CravingEvent[] }) {
  const t = useT();
  const summary = buildCravingSummary(events);

  const formatDuration = (seconds: number) =>
    seconds >= 60
      ? t("cravings.minutes", { n: Math.round(seconds / 60) })
      : t("cravings.seconds", { n: seconds });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Waves className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          {t("cravings.title")}
        </CardTitle>
        <CardDescription>
          {summary.total === 0 ? t("cravings.empty") : t("cravings.body")}
        </CardDescription>
      </CardHeader>

      {summary.total > 0 && (
        <CardContent className="space-y-2">
          <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">
            {t("cravings.riddenOut", { passed: summary.passed, total: summary.total })}
          </p>
          {summary.medianSeconds !== null && (
            <p className="text-sm text-body">
              {t("cravings.typicalTime", { time: formatDuration(summary.medianSeconds) })}
            </p>
          )}
          {summary.averageIntensity !== null && (
            <p className="text-xs text-subtle">
              {t("cravings.averageIntensity", { n: summary.averageIntensity })}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
