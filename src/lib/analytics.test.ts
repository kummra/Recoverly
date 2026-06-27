import { addDays, startOfMonth, subMonths } from "date-fns";
import { describe, expect, it } from "vitest";

import { buildAnalytics, suggestInsight } from "@/lib/analytics";
import type { DrinkRecord } from "@/lib/firestore";

function rec(quantity: number, createdAt: Date): DrinkRecord {
  return { id: Math.random().toString(36).slice(2), quantity, type: "beer", createdAt };
}

const now = new Date();
const thisMonth = addDays(startOfMonth(now), 1); // safely inside the current month
const lastMonth = addDays(startOfMonth(subMonths(now, 1)), 1);

describe("buildAnalytics", () => {
  it("returns zeros for no records (and 6 months of bar data)", () => {
    const a = buildAnalytics([]);
    expect(a.currentMonthTotal).toBe(0);
    expect(a.previousMonthTotal).toBe(0);
    expect(a.improvementPercent).toBe(0);
    expect(a.dailyLineData).toEqual([]);
    expect(a.monthlyBarData).toHaveLength(6);
  });

  it("sums the current month", () => {
    const a = buildAnalytics([rec(330, thisMonth), rec(170, thisMonth)]);
    expect(a.currentMonthTotal).toBe(500);
  });

  it("computes improvement when intake drops vs last month", () => {
    const a = buildAnalytics([rec(100, lastMonth), rec(50, thisMonth)]);
    expect(a.previousMonthTotal).toBe(100);
    expect(a.currentMonthTotal).toBe(50);
    expect(a.improvementPercent).toBe(50); // (100-50)/100 * 100
  });

  it("reports a negative improvement when intake rises", () => {
    const a = buildAnalytics([rec(50, lastMonth), rec(100, thisMonth)]);
    expect(a.improvementPercent).toBeLessThan(0);
  });

  it("projects six months from the daily average", () => {
    const a = buildAnalytics([rec(300, thisMonth)]);
    expect(a.projectionSixMonths).toBeGreaterThan(0);
  });
});

describe("suggestInsight", () => {
  const base = {
    currentMonthTotal: 0,
    previousMonthTotal: 0,
    dailyAverage: 0,
    improvementPercent: 0,
    projectionSixMonths: 0,
    dailyLineData: [],
    monthlyBarData: []
  };

  it("encourages when there are no drinks logged", () => {
    expect(suggestInsight({ ...base, currentMonthTotal: 0 })).toMatch(/no logged drinks/i);
  });
  it("celebrates a downward trend", () => {
    expect(suggestInsight({ ...base, currentMonthTotal: 50, improvementPercent: 25 })).toMatch(/down by 25%/i);
  });
  it("gently flags an upward trend without shaming", () => {
    const msg = suggestInsight({ ...base, currentMonthTotal: 200, improvementPercent: -10 });
    expect(msg).toMatch(/higher than last month/i);
    expect(msg).not.toMatch(/fail|bad|shame/i);
  });
  it("notes a stable pattern", () => {
    expect(suggestInsight({ ...base, currentMonthTotal: 100, improvementPercent: 0 })).toMatch(/stable/i);
  });
});
