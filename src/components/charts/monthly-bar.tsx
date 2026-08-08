"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useT } from "@/components/i18n-provider";
import { useChartTheme } from "@/components/charts/chart-theme";

type Props = {
  data: Array<{ month: string; total: number }>;
};

export function MonthlyBarChart({ data }: Props) {
  const t = useT();
  const theme = useChartTheme();

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">{t("records.noneYet")}</p>;
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis dataKey="month" tick={{ fill: theme.tick, fontSize: 12 }} />
          <YAxis tick={{ fill: theme.tick, fontSize: 12 }} />
          <Tooltip contentStyle={theme.tooltip} cursor={{ fill: theme.tooltipCursor }} />
          <Bar dataKey="total" fill="#38bdf8" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
