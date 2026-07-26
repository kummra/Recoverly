import { addDays, startOfMonth, subMonths } from "date-fns";
import { describe, expect, it } from "vitest";

import { buildAnalytics, buildProgress, dayKey, shouldShowReminder, suggestInsight } from "@/lib/analytics";
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

describe("buildProgress (streaks)", () => {
  const fixedNow = new Date(2026, 5, 27, 12, 0, 0); // Jun 27 2026
  const day = (y: number, m: number, d: number) => new Date(y, m, d, 10, 0, 0);
  const drink = (createdAt: Date): DrinkRecord => ({
    id: Math.random().toString(36).slice(2),
    quantity: 100,
    type: "beer",
    createdAt
  });

  it("new user: no history, no streak, whole month alcohol-free", () => {
    const p = buildProgress([], fixedNow);
    expect(p.hasHistory).toBe(false);
    expect(p.currentStreakDays).toBe(0);
    expect(p.longestStreakDays).toBe(0);
    expect(p.totalCheckIns).toBe(0);
    expect(p.daysElapsedThisMonth).toBe(27);
    expect(p.alcoholFreeDaysThisMonth).toBe(27);
  });

  it("a drink logged today resets the current streak to 0", () => {
    const p = buildProgress([drink(day(2026, 5, 27))], fixedNow);
    expect(p.hasHistory).toBe(true);
    expect(p.currentStreakDays).toBe(0);
  });

  it("counts days since the last drink", () => {
    const p = buildProgress([drink(day(2026, 5, 24))], fixedNow);
    expect(p.currentStreakDays).toBe(3); // Jun 24 -> Jun 27
    expect(p.longestStreakDays).toBe(3);
  });

  it("longest streak is the best gap even when the current run is short", () => {
    // drinks Jun 1, Jun 10, Jun 26 ; gaps 8 and 15 ; current run only 1 day
    const p = buildProgress(
      [drink(day(2026, 5, 1)), drink(day(2026, 5, 10)), drink(day(2026, 5, 26))],
      fixedNow
    );
    expect(p.currentStreakDays).toBe(1);
    expect(p.longestStreakDays).toBe(15);
  });

  it("treats multiple logs in one day as a single drink day", () => {
    const p = buildProgress(
      [drink(day(2026, 5, 20)), drink(day(2026, 5, 20)), drink(day(2026, 5, 20))],
      fixedNow
    );
    expect(p.totalCheckIns).toBe(3);
    expect(p.currentStreakDays).toBe(7); // Jun 20 -> Jun 27
    expect(p.alcoholFreeDaysThisMonth).toBe(26); // 27 elapsed - 1 drink day
  });
});

describe("shouldShowReminder", () => {
  const at = (h: number, m: number) => new Date(2026, 5, 27, h, m, 0);

  it("stays silent when no reminder time is set", () => {
    expect(shouldShowReminder({ now: at(21, 0) })).toBe(false);
    expect(shouldShowReminder({ reminderTime: "", now: at(21, 0) })).toBe(false);
  });

  it("stays silent before the reminder time", () => {
    expect(shouldShowReminder({ reminderTime: "20:00", now: at(19, 59) })).toBe(false);
  });

  it("shows at and after the reminder time", () => {
    expect(shouldShowReminder({ reminderTime: "20:00", now: at(20, 0) })).toBe(true);
    expect(shouldShowReminder({ reminderTime: "20:00", now: at(23, 30) })).toBe(true);
  });

  it("stays silent once dismissed today, but returns the next day", () => {
    const now = at(21, 0);
    expect(shouldShowReminder({ reminderTime: "20:00", lastDismissedDayKey: dayKey(now), now })).toBe(false);
    expect(shouldShowReminder({ reminderTime: "20:00", lastDismissedDayKey: "2026-06-26", now })).toBe(true);
  });

  it("ignores a malformed reminder time", () => {
    expect(shouldShowReminder({ reminderTime: "25:00", now: at(23, 0) })).toBe(false);
    expect(shouldShowReminder({ reminderTime: "8pm", now: at(23, 0) })).toBe(false);
  });
});
