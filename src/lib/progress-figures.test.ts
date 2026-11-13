import { describe, expect, it } from "vitest";

import { MIN_DAYS_FOR_FIGURES, buildProgressFigures, cleanFigures } from "@/lib/progress-figures";

// Local dates, like the app's own analytics: month 9 is October.
const at = (y: number, m: number, d: number, h = 20) => new Date(y, m, d, h, 0, 0);
const NOW = at(2026, 10, 12); // 12 November 2026
const drink = (y: number, m: number, d: number, quantity = 330) => ({ createdAt: at(y, m, d), quantity });

describe("buildProgressFigures", () => {
  it("is about the month that just ended, as a whole percent of its days with no drink", () => {
    // History from 1 September. October has 31 days; drinks on 10 of them.
    const records = [drink(2026, 8, 1), ...Array.from({ length: 10 }, (_, i) => drink(2026, 9, i + 1))];
    expect(buildProgressFigures(records, NOW)).toMatchObject({ month: "2026-10", freeDayPct: Math.round((21 / 31) * 100) });
  });

  it("counts a day with several drinks once", () => {
    const records = [drink(2026, 8, 1), drink(2026, 9, 5), drink(2026, 9, 5, 500), drink(2026, 9, 5, 100)];
    expect(buildProgressFigures(records, NOW)?.freeDayPct).toBe(Math.round((30 / 31) * 100));
  });

  it("does not count the days before the person started as alcohol-free days", () => {
    // First record on 20 October: only 12 days (20 to 31) are counted, one of them a drink day.
    const records = [drink(2026, 9, 20)];
    expect(buildProgressFigures(records, NOW)?.freeDayPct).toBe(Math.round((11 / 12) * 100));
  });

  it("says nothing when too few days are left to be honest, or there is no history", () => {
    expect(buildProgressFigures([], NOW)).toBeNull();
    // Started on 28 October: only 4 days in the month.
    expect(buildProgressFigures([drink(2026, 9, 28)], NOW)).toBeNull();
    // Started this month: nothing about last month at all.
    expect(buildProgressFigures([drink(2026, 10, 3)], NOW)).toBeNull();
    expect(MIN_DAYS_FOR_FIGURES).toBe(7);
    // Exactly seven counted days is enough (25 to 31 October).
    expect(buildProgressFigures([drink(2026, 9, 25)], NOW)).not.toBeNull();
  });

  it("says whether they drank less than the month before, by the amount, not the days", () => {
    const heavySeptember = [drink(2026, 8, 3, 1000), drink(2026, 8, 9, 1000)];
    expect(buildProgressFigures([...heavySeptember, drink(2026, 9, 4, 400)], NOW)?.lessThanBefore).toBe(true);
    expect(buildProgressFigures([...heavySeptember, drink(2026, 9, 4, 1500), drink(2026, 9, 6, 1500)], NOW)?.lessThanBefore).toBe(false);
    // Equal is not "less".
    expect(buildProgressFigures([drink(2026, 8, 3, 500), drink(2026, 9, 4, 500)], NOW)?.lessThanBefore).toBe(false);
  });

  it("has nothing to compare with when there is no earlier month, or they did not drink in it", () => {
    expect(buildProgressFigures([drink(2026, 9, 2)], NOW)?.lessThanBefore).toBeNull();
    // September was alcohol-free (first record is a 0 ml check-in), so "less" has no meaning.
    expect(buildProgressFigures([drink(2026, 8, 2, 0), drink(2026, 9, 4, 300)], NOW)?.lessThanBefore).toBeNull();
  });

  it("carries nothing but the month and two numbers", () => {
    const figures = buildProgressFigures([drink(2026, 8, 1), drink(2026, 9, 5)], NOW);
    expect(Object.keys(figures ?? {}).sort()).toEqual(["freeDayPct", "lessThanBefore", "month"]);
  });

  it("works across a year end", () => {
    expect(buildProgressFigures([drink(2026, 10, 1), drink(2026, 11, 9)], at(2027, 0, 8))).toMatchObject({ month: "2026-12" });
  });
});

describe("cleanFigures", () => {
  const good = { month: "2026-10", freeDayPct: 72, lessThanBefore: true };

  it("accepts exactly last month's, in whole percent, with a yes, no or nothing to compare", () => {
    expect(cleanFigures(good, "2026-11")).toEqual(good);
    expect(cleanFigures({ ...good, lessThanBefore: null }, "2026-11")).toEqual({ ...good, lessThanBefore: null });
    expect(cleanFigures({ month: "2026-12", freeDayPct: 0, lessThanBefore: false }, "2027-01")).not.toBeNull();
  });

  it("drops extra fields, so nothing else rides along", () => {
    expect(cleanFigures({ ...good, email: "a@b.c", uid: "x" }, "2026-11")).toEqual(good);
  });

  it("refuses anything else", () => {
    for (const bad of [null, undefined, "x", 4, [], {}, { ...good, month: "2026-11" }, { ...good, month: "2026-09" }, { ...good, freeDayPct: 100.5 }, { ...good, freeDayPct: 101 }, { ...good, freeDayPct: -1 }, { ...good, freeDayPct: "50" }, { ...good, lessThanBefore: "true" }, { ...good, lessThanBefore: undefined }]) {
      expect(cleanFigures(bad, "2026-11"), JSON.stringify(bad)).toBeNull();
    }
  });
});
