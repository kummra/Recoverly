import { differenceInCalendarDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";

import type { DrinkRecord } from "@/lib/firestore";

export type AnalyticsSummary = {
  currentMonthTotal: number;
  previousMonthTotal: number;
  dailyAverage: number;
  improvementPercent: number;
  projectionSixMonths: number;
  dailyLineData: Array<{ day: string; quantity: number }>;
  monthlyBarData: Array<{ month: string; total: number }>;
};

function sumQuantities(records: DrinkRecord[]) {
  return records.reduce((total, record) => total + record.quantity, 0);
}

export function buildAnalytics(records: DrinkRecord[]): AnalyticsSummary {
  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const previousStart = startOfMonth(subMonths(now, 1));
  const previousEnd = endOfMonth(subMonths(now, 1));

  const currentMonthRecords = records.filter((item) => item.createdAt >= currentStart && item.createdAt <= currentEnd);
  const previousMonthRecords = records.filter((item) => item.createdAt >= previousStart && item.createdAt <= previousEnd);

  const currentMonthTotal = sumQuantities(currentMonthRecords);
  const previousMonthTotal = sumQuantities(previousMonthRecords);

  const daysElapsed = Math.max(differenceInCalendarDays(now, currentStart) + 1, 1);
  const dailyAverage = currentMonthTotal / daysElapsed;
  const projectionSixMonths = Math.round(dailyAverage * 30 * 6);

  const improvementPercent =
    previousMonthTotal > 0
      ? Number((((previousMonthTotal - currentMonthTotal) / previousMonthTotal) * 100).toFixed(1))
      : 0;

  const dayMap = new Map<string, number>();
  for (const record of currentMonthRecords) {
    const key = format(record.createdAt, "MMM dd");
    dayMap.set(key, (dayMap.get(key) ?? 0) + record.quantity);
  }
  const dailyLineData = Array.from(dayMap.entries()).map(([day, quantity]) => ({ day, quantity }));

  const monthlyBarData = Array.from({ length: 6 }).map((_, index) => {
    const monthDate = subMonths(now, 5 - index);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const total = sumQuantities(records.filter((record) => record.createdAt >= start && record.createdAt <= end));
    return {
      month: format(monthDate, "MMM"),
      total
    };
  });

  return {
    currentMonthTotal,
    previousMonthTotal,
    dailyAverage: Number(dailyAverage.toFixed(1)),
    improvementPercent,
    projectionSixMonths,
    dailyLineData,
    monthlyBarData
  };
}

export function suggestInsight(summary: AnalyticsSummary) {
  if (summary.currentMonthTotal === 0) {
    return "You have no logged drinks this month. Keep reinforcing the routines helping you stay steady.";
  }

  if (summary.improvementPercent > 0) {
    return `Your monthly intake is down by ${summary.improvementPercent}%. Consistent effort is clearly working.`;
  }

  if (summary.improvementPercent < 0) {
    return "Your current trend is higher than last month. A small pause and support check-in can help reset momentum.";
  }

  return "Your monthly pattern is stable. Small daily choices now can create a visible long-term drop.";
}
