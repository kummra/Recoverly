import { en } from "@/lib/i18n/en";
import { addDays, startOfMonth, subMonths } from "date-fns";
import { describe, expect, it } from "vitest";

import {
  breathPhaseAt,
  buildAnalytics,
  buildMilestones,
  buildProgress,
  buildSavings,
  buildTriggerInsights,
  dayKey,
  shouldShowReminder,
  suggestInsight
} from "@/lib/analytics";
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
    expect(suggestInsight({ ...base, currentMonthTotal: 0 }).key).toBe("insight.none");
  });
  it("celebrates a downward trend", () => {
    expect(suggestInsight({ ...base, currentMonthTotal: 50, improvementPercent: 25 })).toEqual({
      key: "insight.down",
      params: { percent: 25 }
    });
  });
  it("gently flags an upward trend without shaming", () => {
    const { key } = suggestInsight({ ...base, currentMonthTotal: 200, improvementPercent: -10 });
    expect(key).toBe("insight.up");
    // The copy now lives in the dictionary, so assert on what the user actually reads.
    expect(en[key]).toMatch(/higher than last month/i);
    expect(en[key]).not.toMatch(/fail|bad|shame/i);
  });
  it("notes a stable pattern", () => {
    expect(suggestInsight({ ...base, currentMonthTotal: 100, improvementPercent: 0 }).key).toBe("insight.stable");
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

describe("breathPhaseAt", () => {
  it("starts on the in-breath", () => {
    const p = breathPhaseAt(0);
    expect(p.label).toBe("Breathe in");
    expect(p.remaining).toBe(4);
  });

  it("moves through in -> hold -> out", () => {
    expect(breathPhaseAt(2).label).toBe("Breathe in");
    expect(breathPhaseAt(5).label).toBe("Hold");
    expect(breathPhaseAt(9).label).toBe("Breathe out");
  });

  it("repeats every cycle", () => {
    expect(breathPhaseAt(14).label).toBe(breathPhaseAt(0).label);
    expect(breathPhaseAt(15).remaining).toBe(breathPhaseAt(1).remaining);
  });

  it("counts down within a step and never hits zero", () => {
    for (let t = 0; t < 42; t++) {
      const p = breathPhaseAt(t);
      expect(p.remaining).toBeGreaterThan(0);
      expect(p.remaining).toBeLessThanOrEqual(6);
    }
  });

  it("keeps scale within the animation bounds, peaking on hold", () => {
    for (let t = 0; t < 42; t++) {
      const p = breathPhaseAt(t);
      expect(p.scale).toBeGreaterThanOrEqual(0.75);
      expect(p.scale).toBeLessThanOrEqual(1);
    }
    expect(breathPhaseAt(5).scale).toBe(1);
  });

  it("is defined for negative input rather than throwing", () => {
    expect(breathPhaseAt(-1).label).toBeDefined();
  });
});

describe("buildSavings", () => {
  const now = new Date(2026, 7, 15); // 15 Aug 2026
  const at = (monthOffset: number, day = 5) => new Date(2026, 7 - monthOffset, day, 20, 0, 0);
  const rec = (quantity: number, createdAt: Date, type = "whiskey"): DrinkRecord => ({
    id: Math.random().toString(36).slice(2), quantity, type, createdAt
  });

  it("reports no baseline for a brand-new user", () => {
    const s = buildSavings([], now);
    expect(s.hasBaseline).toBe(false);
    expect(s.rupeesSaved).toBe(0);
    expect(s.baselineMonth).toBeNull();
  });

  it("compares against the heaviest previous month", () => {
    const s = buildSavings([rec(1000, at(1)), rec(200, at(2)), rec(100, at(0))], now);
    expect(s.hasBaseline).toBe(true);
    expect(s.baselineMonth).toBe("Jul");
    expect(s.rupeesSaved).toBeGreaterThan(0);
    expect(s.kcalAvoided).toBeGreaterThan(0);
  });

  it("never reports a negative saving when this month is heavier", () => {
    const s = buildSavings([rec(100, at(1)), rec(5000, at(0))], now);
    expect(s.rupeesSaved).toBe(0);
    expect(s.kcalAvoided).toBe(0);
  });
});

describe("buildMilestones", () => {
  it("marks reached milestones and finds the next", () => {
    const { milestones, next, daysToNext } = buildMilestones(9, 9);
    expect(milestones.find((m) => m.days === 7)?.reached).toBe(true);
    expect(milestones.find((m) => m.days === 14)?.reached).toBe(false);
    expect(next?.days).toBe(14);
    expect(daysToNext).toBe(5);
  });

  it("credits the personal best even after a reset", () => {
    const { milestones } = buildMilestones(0, 30);
    expect(milestones.find((m) => m.days === 30)?.reached).toBe(true);
  });

  it("returns no next milestone once all are reached", () => {
    expect(buildMilestones(400, 400).next).toBeNull();
  });
});

describe("buildTriggerInsights", () => {
  const mk = (createdAt: Date, mood?: string): DrinkRecord => ({
    id: Math.random().toString(36).slice(2), quantity: 100, type: "beer", createdAt, mood
  });

  it("stays silent without enough data — a pattern from 3 drinks is noise", () => {
    const few = [mk(new Date(2026, 7, 7, 20)), mk(new Date(2026, 7, 14, 20)), mk(new Date(2026, 7, 21, 20))];
    expect(buildTriggerInsights(few)).toEqual([]);
  });

  it("surfaces a strong day-of-week pattern", () => {
    // 8 Fridays (Aug 2026: 7th, 14th, 21st, 28th are Fridays)
    const fridays = [7, 14, 21, 28, 7, 14, 21, 28].map((d) => mk(new Date(2026, 7, d, 20)));
    const out = buildTriggerInsights(fridays);
    expect(out.some((i) => i.labelKey === "trigger.fridays")).toBe(true);
  });

  it("surfaces a time-of-day pattern", () => {
    const evenings = Array.from({ length: 10 }, (_, i) => mk(new Date(2026, 7, i + 1, 21)));
    const out = buildTriggerInsights(evenings);
    expect(out.some((i) => i.labelKey === "trigger.evenings")).toBe(true);
  });

  it("surfaces a repeated mood trigger", () => {
    const stressed = Array.from({ length: 10 }, (_, i) => mk(new Date(2026, 7, i + 1, 13), "stressed"));
    const out = buildTriggerInsights(stressed);
    expect(out.some((i) => i.labelKey === "trigger.mood" && i.mood === "stressed")).toBe(true);
  });

  it("reports shares between 0 and 1", () => {
    const evenings = Array.from({ length: 10 }, (_, i) => mk(new Date(2026, 7, i + 1, 21)));
    for (const i of buildTriggerInsights(evenings)) {
      expect(i.share).toBeGreaterThan(0);
      expect(i.share).toBeLessThanOrEqual(1);
    }
  });
});
