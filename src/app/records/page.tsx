"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Calendar, Activity, BarChart3, Target } from "lucide-react";

import { ConsumptionLineChart } from "@/components/charts/consumption-line";
import { useT } from "@/components/i18n-provider";
import { MonthlyBarChart } from "@/components/charts/monthly-bar";
import { ProgressInsights } from "@/components/progress-insights";
import { ProtectedRoute } from "@/components/protected-route";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { buildAnalytics, buildProgress, suggestInsight } from "@/lib/analytics";
import { type DrinkRecord, getDrinkRecords } from "@/lib/firestore";

export default function RecordsPage() {
  return (
    <ProtectedRoute>
      <RecordsContent />
    </ProtectedRoute>
  );
}

function RecordsContent() {
  const t = useT();
  const { user } = useAuth();
  const [records, setRecords] = useState<DrinkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    getDrinkRecords(user.uid)
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch(() => {
        // Without this the user sees the "no records yet" empty state, which
        // reads as "your history is gone" — alarming when it's just a failed load.
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const summary = useMemo(() => buildAnalytics(records), [records]);
  const insight = useMemo(() => suggestInsight(summary), [summary]);
  const progress = useMemo(() => buildProgress(records), [records]);

  if (loading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  if (loadFailed) {
    return (
      <Card className="animate-fade-in-up border-amber-500/30">
        <CardHeader>
          <CardTitle>{t("records.loadFailedTitle")}</CardTitle>
          <CardDescription>{t("records.loadFailedBody")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!records.length) {
    return (
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>{t("records.emptyTitle")}</CardTitle>
          <CardDescription>{t("records.emptyBody")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const improvementPositive = summary.improvementPercent > 0;

  return (
    <div className="stagger-children space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold">{t("records.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("records.subtitle")}</p>
      </div>

      <ProgressInsights
        records={records}
        currentStreakDays={progress.currentStreakDays}
        longestStreakDays={progress.longestStreakDays}
      />

      {/* Stats row - color coded */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title={t("records.currentMonth")}
          value={summary.currentMonthTotal}
          unit="ml"
          icon={Calendar}
          color="sky"
        />
        <StatCard
          title={t("records.dailyAverage")}
          value={summary.dailyAverage}
          unit="ml"
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title={t("records.previousMonth")}
          value={summary.previousMonthTotal}
          unit="ml"
          icon={BarChart3}
          color="slate"
        />
        <StatCard
          title={t("records.improvement")}
          value={summary.improvementPercent}
          unit="%"
          icon={improvementPositive ? TrendingDown : TrendingUp}
          color={improvementPositive ? "emerald" : "amber"}
        />
        <StatCard
          title={t("records.projection")}
          value={summary.projectionSixMonths}
          unit="ml"
          icon={Target}
          color="violet"
        />
      </div>

      {/* Insight */}
      <Card className="border-indigo-500/15 bg-gradient-to-r from-card to-indigo-50 dark:to-indigo-950/15">
        <CardHeader>
          <CardTitle className="text-base">{t("records.insight")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-body">{t(insight.key, insight.params)}</p>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("records.dailyConsumption")}</CardTitle>
            <CardDescription>{t("records.dailyConsumptionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ConsumptionLineChart data={summary.dailyLineData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("records.monthlyTotals")}</CardTitle>
            <CardDescription>{t("records.monthlyTotalsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart data={summary.monthlyBarData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type StatColor = "emerald" | "sky" | "amber" | "indigo" | "violet" | "slate";

const colorMap: Record<StatColor, { border: string; bg: string; text: string }> = {
  emerald: { border: "border-emerald-500/20", bg: "bg-emerald-50 dark:bg-emerald-950/15", text: "text-emerald-700 dark:text-emerald-400" },
  sky: { border: "border-sky-500/20", bg: "bg-sky-50 dark:bg-sky-950/15", text: "text-sky-600 dark:text-sky-400" },
  amber: { border: "border-amber-500/20", bg: "bg-amber-50 dark:bg-amber-950/15", text: "text-amber-600 dark:text-amber-400" },
  indigo: { border: "border-indigo-500/20", bg: "bg-indigo-50 dark:bg-indigo-950/15", text: "text-indigo-600 dark:text-indigo-400" },
  violet: { border: "border-violet-500/20", bg: "bg-violet-950/15", text: "text-violet-400" },
  slate: { border: "", bg: "", text: "text-muted-foreground" }
};

function StatCard({
  title,
  value,
  unit,
  icon: Icon,
  color
}: {
  title: string;
  value: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: StatColor;
}) {
  const c = colorMap[color];
  return (
    <Card className={`${c.border} ${c.bg}`}>
      <CardHeader className="pb-2">
        <CardDescription className={`flex items-center gap-1.5 ${c.text}`}>
          <Icon className="h-3.5 w-3.5" />
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p>
      </CardContent>
    </Card>
  );
}
