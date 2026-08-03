"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Calendar, Activity, BarChart3, Target } from "lucide-react";

import { ConsumptionLineChart } from "@/components/charts/consumption-line";
import { MonthlyBarChart } from "@/components/charts/monthly-bar";
import { ProtectedRoute } from "@/components/protected-route";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { buildAnalytics, suggestInsight } from "@/lib/analytics";
import { type DrinkRecord, getDrinkRecords } from "@/lib/firestore";

export default function RecordsPage() {
  return (
    <ProtectedRoute>
      <RecordsContent />
    </ProtectedRoute>
  );
}

function RecordsContent() {
  const { user } = useAuth();
  const [records, setRecords] = useState<DrinkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDrinkRecords(user.uid)
      .then(setRecords)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const summary = useMemo(() => buildAnalytics(records), [records]);
  const insight = useMemo(() => suggestInsight(summary), [summary]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading records...</p>;

  if (!records.length) {
    return (
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle>No records yet</CardTitle>
          <CardDescription>Log your first check-in from Dashboard to start seeing insights.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const improvementPositive = summary.improvementPercent > 0;

  return (
    <div className="stagger-children space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold">Records & Insights</h2>
        <p className="text-sm text-muted-foreground">Your data tells the story of progress.</p>
      </div>

      {/* Stats row - color coded */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Current Month"
          value={summary.currentMonthTotal}
          unit="ml"
          icon={Calendar}
          color="sky"
        />
        <StatCard
          title="Daily Average"
          value={summary.dailyAverage}
          unit="ml"
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title="Previous Month"
          value={summary.previousMonthTotal}
          unit="ml"
          icon={BarChart3}
          color="slate"
        />
        <StatCard
          title="Improvement"
          value={summary.improvementPercent}
          unit="%"
          icon={improvementPositive ? TrendingDown : TrendingUp}
          color={improvementPositive ? "emerald" : "amber"}
        />
        <StatCard
          title="6-Mo Projection"
          value={summary.projectionSixMonths}
          unit="ml"
          icon={Target}
          color="violet"
        />
      </div>

      {/* Insight */}
      <Card className="border-indigo-500/15 bg-gradient-to-r from-card to-indigo-50 dark:to-indigo-950/15">
        <CardHeader>
          <CardTitle className="text-base">Insight</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-body">{insight}</p>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Consumption</CardTitle>
            <CardDescription>Current month day by day</CardDescription>
          </CardHeader>
          <CardContent>
            <ConsumptionLineChart data={summary.dailyLineData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Totals</CardTitle>
            <CardDescription>Your trend over time</CardDescription>
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
  emerald: { border: "border-emerald-500/20", bg: "bg-emerald-50 dark:bg-emerald-950/15", text: "text-emerald-600 dark:text-emerald-400" },
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
