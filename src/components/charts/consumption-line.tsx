"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useT } from "@/components/i18n-provider";
import { useChartTheme } from "@/components/charts/chart-theme";

type Props = {
  data: Array<{ day: string; quantity: number }>;
};

export function ConsumptionLineChart({ data }: Props) {
  const t = useT();
  const theme = useChartTheme();

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">{t("records.noneYet")}</p>;
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis dataKey="day" tick={{ fill: theme.tick, fontSize: 12 }} />
          <YAxis tick={{ fill: theme.tick, fontSize: 12 }} />
          <Tooltip contentStyle={theme.tooltip} cursor={{ stroke: theme.grid }} />
          <Line type="monotone" dataKey="quantity" stroke="#34d399" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
