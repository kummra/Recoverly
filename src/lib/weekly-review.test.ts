import { describe, expect, it } from "vitest";

import { MIN_REVIEW_DAYS, buildWeeklyReview, reviewMessage } from "@/lib/weekly-review";

/** Local noon on a day: 2026-11-10 is a Tuesday. */
const day = (d: number, hour = 12) => new Date(2026, 10, d, hour, 0, 0);
const now = day(12, 15); // Thursday afternoon

const drink = (d: number, hour = 20) => ({ createdAt: day(d, hour) });
const craving = (d: number, outcome = "passed") => ({ createdAt: day(d), outcome });

describe("buildWeeklyReview", () => {
  it("says nothing for someone with no history", () => {
    expect(buildWeeklyReview([], [], now)).toBeNull();
  });

  it("says nothing until there are three days to look at", () => {
    // Started yesterday: two days.
    expect(buildWeeklyReview([drink(11)], [], now)).toBeNull();
    // Started the day before: three days.
    expect(buildWeeklyReview([drink(10)], [], now)).not.toBeNull();
    expect(MIN_REVIEW_DAYS).toBe(3);
  });

  it("does not count days before the person started as alcohol-free", () => {
    // First activity on the 10th: the window is the 10th, 11th and 12th only.
    const review = buildWeeklyReview([drink(10)], [], now);
    expect(review?.days).toHaveLength(3);
    expect(review?.alcoholFreeDays).toBe(2);
  });

  it("looks at the last seven calendar days, today included, for a longer history", () => {
    const review = buildWeeklyReview([drink(1), drink(7)], [], now);
    expect(review?.days).toHaveLength(7);
    expect(review?.days[0].date).toEqual(new Date(2026, 10, 6));
    expect(review?.days[6].date).toEqual(new Date(2026, 10, 12));
    // The drink on the 7th is inside the window; the one on the 1st is not.
    expect(review?.alcoholFreeDays).toBe(6);
    expect(review?.checkIns).toBe(1);
  });

  it("marks a day with several drinks as one drink day", () => {
    const review = buildWeeklyReview([drink(1), drink(9, 12), drink(9, 18), drink(9, 23)], [], now);
    expect(review?.alcoholFreeDays).toBe(6);
    expect(review?.checkIns).toBe(3);
  });

  it("counts today as alcohol-free until a drink is logged today", () => {
    expect(buildWeeklyReview([drink(1)], [], now)?.days.at(-1)?.free).toBe(true);
    expect(buildWeeklyReview([drink(1), drink(12, 9)], [], now)?.days.at(-1)?.free).toBe(false);
  });

  it("counts cravings this week and how many passed without a drink", () => {
    const review = buildWeeklyReview([drink(1)], [craving(11), craving(10, "drank"), craving(9, "unresolved"), craving(2)], now);
    expect(review?.cravings).toEqual({ total: 3, passed: 1 });
  });

  it("starts from a first craving when there are no drinks yet", () => {
    const review = buildWeeklyReview([], [craving(9)], now);
    expect(review?.days).toHaveLength(4);
    expect(review?.alcoholFreeDays).toBe(4);
    expect(review?.cravings).toEqual({ total: 1, passed: 1 });
  });

  it("ignores anything dated in the future", () => {
    const review = buildWeeklyReview([drink(1), { createdAt: day(14) }], [], now);
    expect(review?.checkIns).toBe(0);
  });

  it("does not let a daylight-saving change or a late-evening drink move a day", () => {
    // 23:59 and 00:01 are on different days, however the clock is set.
    const review = buildWeeklyReview([{ createdAt: new Date(2026, 10, 9, 23, 59) }, { createdAt: new Date(2026, 10, 10, 0, 1) }, drink(1)], [], now);
    const free = review?.days.map((d) => d.free);
    expect(free).toEqual([true, true, true, false, false, true, true]);
  });
});

describe("reviewMessage", () => {
  const base = { checkIns: 0, cravings: { total: 0, passed: 0 } };
  const mk = (flags: boolean[]) => ({ ...base, days: flags.map((free, i) => ({ date: new Date(2026, 10, i + 1), free })), alcoholFreeDays: flags.filter(Boolean).length });

  it("celebrates a whole week, notes a partial one kindly, and never scolds a hard one", () => {
    expect(reviewMessage(mk([true, true, true, true, true, true, true]))).toBe("all");
    expect(reviewMessage(mk([true, false, true, true, true, true, true]))).toBe("some");
    expect(reviewMessage(mk([false, false, false, false, false, false, false]))).toBe("none");
  });
});
