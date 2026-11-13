import { describe, expect, it } from "vitest";

import { NO_OUTCOMES, buildOutcomeRows, cleanOutcomes, contribution, displayOutcomes } from "@/lib/programme-outcomes";
import { MIN_GROUP } from "@/lib/programme-count";

describe("contribution", () => {
  it("is one person's figures as four numbers that can be added up", () => {
    expect(contribution({ month: "2026-10", freeDayPct: 72, lessThanBefore: true })).toEqual({ n: 1, freePctSum: 72, lessOf: 1, lessN: 1 });
    expect(contribution({ month: "2026-10", freeDayPct: 40, lessThanBefore: false })).toEqual({ n: 1, freePctSum: 40, lessOf: 1, lessN: 0 });
    expect(contribution({ month: "2026-10", freeDayPct: 90, lessThanBefore: null })).toEqual({ n: 1, freePctSum: 90, lessOf: 0, lessN: 0 });
  });
});

describe("displayOutcomes", () => {
  it("shows nothing below the group size, for each figure on its own", () => {
    expect(displayOutcomes(NO_OUTCOMES)).toEqual({ people: { shown: false }, freeDays: { shown: false }, lessThanBefore: { shown: false } });
    // 19 people: nothing at all.
    const nineteen = displayOutcomes({ n: 19, freePctSum: 19 * 80, lessOf: 19, lessN: 10 });
    expect(nineteen).toEqual({ people: { shown: false }, freeDays: { shown: false }, lessThanBefore: { shown: false } });
    // 25 shared figures but only 12 could be compared: the average shows, the comparison does not.
    const partial = displayOutcomes({ n: 25, freePctSum: 25 * 60, lessOf: 12, lessN: 9 });
    expect(partial.freeDays).toEqual({ shown: true, percent: 60 });
    expect(partial.lessThanBefore).toEqual({ shown: false });
  });

  it("shows averages rounded to the nearest 5, and never above 100", () => {
    expect(displayOutcomes({ n: 20, freePctSum: 20 * 72, lessOf: 20, lessN: 13 })).toMatchObject({ freeDays: { shown: true, percent: 70 }, lessThanBefore: { shown: true, percent: 65 } });
    expect(displayOutcomes({ n: 20, freePctSum: 20 * 100, lessOf: 20, lessN: 20 })).toMatchObject({ freeDays: { shown: true, percent: 100 }, lessThanBefore: { shown: true, percent: 100 } });
    expect(displayOutcomes({ n: 23, freePctSum: 23 * 98, lessOf: 20, lessN: 20 }).freeDays).toEqual({ shown: true, percent: 100 });
  });

  it("never shows a figure that rests on fewer people than the group size", () => {
    for (let n = 0; n < 200; n++) {
      const d = displayOutcomes({ n, freePctSum: n * 50, lessOf: n, lessN: Math.floor(n / 2) });
      if (n < MIN_GROUP) expect([d.people.shown, d.freeDays.shown, d.lessThanBefore.shown], String(n)).toEqual([false, false, false]);
    }
  });
});

describe("buildOutcomeRows", () => {
  const now = new Date("2026-11-12T09:30:00Z");
  it("lists last month first (figures for a month arrive in the month after it), six months back", () => {
    const rows = buildOutcomeRows({}, now);
    expect(rows.map((r) => r.month)).toEqual(["2026-10", "2026-09", "2026-08", "2026-07", "2026-06", "2026-05"]);
  });
  it("attaches each month's sums", () => {
    const rows = buildOutcomeRows({ "2026-10": { n: 30, freePctSum: 30 * 80, lessOf: 25, lessN: 15 } }, now);
    expect(rows[0].display.freeDays).toEqual({ shown: true, percent: 80 });
    expect(rows[0].display.lessThanBefore).toEqual({ shown: true, percent: 60 });
    expect(rows[1].display.freeDays.shown).toBe(false);
  });
});

describe("cleanOutcomes", () => {
  it("keeps only well-formed months and drops sums that cannot be true", () => {
    const out = cleanOutcomes({
      "2026-10": { n: 30, freePctSum: 2400, lessOf: 20, lessN: 10 },
      "2026-09": { n: 5, freePctSum: 600, lessOf: 5, lessN: 1 }, // average over 100%
      "2026-08": { n: 5, freePctSum: 100, lessOf: 6, lessN: 1 }, // compared more people than shared
      "2026-07": { n: 5, freePctSum: 100, lessOf: 2, lessN: 3 }, // more "less" than compared
      bad: { n: 1, freePctSum: 1, lessOf: 0, lessN: 0 },
      "2026-06": "x"
    });
    expect(out).toEqual({ "2026-10": { n: 30, freePctSum: 2400, lessOf: 20, lessN: 10 } });
    for (const junk of [null, undefined, 5, "x", []]) expect(cleanOutcomes(junk)).toEqual({});
  });
});
