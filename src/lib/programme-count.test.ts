import { describe, expect, it } from "vitest";

import {
  MIN_GROUP,
  REPORT_MONTHS,
  ROUND_TO,
  buildReportRows,
  cleanActiveCounts,
  displayCount,
  isMonthKey,
  monthKey,
  monthLabel,
  parseMonthKey,
  shiftMonth
} from "@/lib/programme-count";

describe("what an organisation may be told", () => {
  it("shows nothing below the group size, however close", () => {
    for (const people of [0, 1, 5, 10, 18, 19, 19.9, -3, NaN, Infinity]) expect(displayCount(people), String(people)).toEqual({ shown: false });
  });

  it("shows a figure from the group size up, rounded to the nearest 5", () => {
    expect(displayCount(20)).toEqual({ shown: true, value: 20 });
    expect(displayCount(22)).toEqual({ shown: true, value: 20 });
    expect(displayCount(23)).toEqual({ shown: true, value: 25 });
    expect(displayCount(27)).toEqual({ shown: true, value: 25 });
    expect(displayCount(28)).toEqual({ shown: true, value: 30 });
    expect(displayCount(1003)).toEqual({ shown: true, value: 1005 });
  });

  it("never shows a figure under the group size, even after rounding", () => {
    for (let people = 0; people < 5000; people++) {
      const shown = displayCount(people);
      if (shown.shown) expect(shown.value, String(people)).toBeGreaterThanOrEqual(MIN_GROUP);
      else expect(people).toBeLessThan(MIN_GROUP);
    }
  });

  it("states its thresholds as the numbers the policy promises", () => {
    expect(MIN_GROUP).toBe(20);
    expect(ROUND_TO).toBe(5);
    expect(MIN_GROUP % ROUND_TO).toBe(0);
  });
});

describe("months", () => {
  it("names the calendar month for people in India, not the server's", () => {
    // 19:00 UTC on 30 November is already 00:30 on 1 December in India.
    expect(monthKey(new Date("2026-11-30T19:00:00Z"))).toBe("2026-12");
    expect(monthKey(new Date("2026-11-30T18:29:59Z"))).toBe("2026-11");
    expect(monthKey(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01");
    expect(monthKey(new Date("2026-11-12T09:30:00Z"))).toBe("2026-11");
  });

  it("reads and checks month keys", () => {
    expect(parseMonthKey("2026-11")).toEqual({ year: 2026, month: 11 });
    for (const bad of ["2026-13", "2026-00", "26-11", "2026-1", "2026/11", "", null, 202611]) expect(isMonthKey(bad), String(bad)).toBe(false);
  });

  it("steps across year ends", () => {
    expect(shiftMonth("2026-11", 0)).toBe("2026-11");
    expect(shiftMonth("2026-11", -1)).toBe("2026-10");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-03", -14)).toBe("2025-01");
    expect(() => shiftMonth("nope", 1)).toThrow();
  });

  it("labels a month in English whatever the machine's own time zone", () => {
    expect(monthLabel("2026-11")).toBe("Nov 2026");
    expect(monthLabel("2027-01")).toBe("Jan 2027");
    expect(monthLabel("bad")).toBe("bad");
  });
});

describe("buildReportRows", () => {
  const now = new Date("2026-11-12T09:30:00Z");

  it("lists the last six months, newest first, ending with this one", () => {
    expect(REPORT_MONTHS).toBe(6);
    expect(buildReportRows({}, now).map((row) => row.month)).toEqual(["2026-11", "2026-10", "2026-09", "2026-08", "2026-07", "2026-06"]);
  });

  it("applies the group size and rounding to every month, and treats a month with no ticks as nothing", () => {
    const rows = buildReportRows({ "2026-11": 44, "2026-10": 23, "2026-09": 19, "2026-07": 31 }, now);
    expect(rows.map((row) => row.display)).toEqual([
      { shown: true, value: 45 },
      { shown: true, value: 25 },
      { shown: false },
      { shown: false },
      { shown: true, value: 30 },
      { shown: false }
    ]);
  });

  it("ignores months outside the window", () => {
    const rows = buildReportRows({ "2020-01": 500 }, now);
    expect(rows.every((row) => !row.display.shown)).toBe(true);
  });
});

describe("cleanActiveCounts", () => {
  it("keeps only well-formed month and count pairs from whatever a database returned", () => {
    expect(cleanActiveCounts({ "2026-11": 4, "2026-10": 7.9, bad: 3, "2026-09": -1, "2026-08": "9", "2026-07": NaN })).toEqual({ "2026-11": 4, "2026-10": 7 });
    for (const junk of [null, undefined, "x", 5, [], true]) expect(cleanActiveCounts(junk), String(junk)).toEqual({});
  });
});
