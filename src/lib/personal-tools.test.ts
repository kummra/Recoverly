import { describe, expect, it } from "vitest";

import { MILESTONE_DAYS, milestoneFor } from "@/lib/milestones";
import { MAX_RISK_DATES, addRiskDate, dayKey, parseRiskDates, upcomingRiskDates } from "@/lib/risk-dates";
import { estimateSaving, parsePrice } from "@/lib/savings";

describe("milestoneFor", () => {
  it("gives the largest milestone reached, and nothing for a short run", () => {
    expect(milestoneFor(0)).toBeNull();
    expect(milestoneFor(2)).toBeNull();
    expect(milestoneFor(3)).toBe(3);
    expect(milestoneFor(29)).toBe(14);
    expect(milestoneFor(400)).toBe(365);
    expect([...MILESTONE_DAYS]).toEqual([...MILESTONE_DAYS].sort((a, b) => a - b));
  });
});

describe("estimateSaving", () => {
  it("is shown only when less was logged than last month and a price was given", () => {
    expect(estimateSaving(2000, 500, 80)).toEqual({ lessMl: 1500, amount: 1200 });
    expect(estimateSaving(500, 500, 80)).toBeNull();
    expect(estimateSaving(500, 900, 80)).toBeNull();
    expect(estimateSaving(2000, 500, 0)).toBeNull();
  });
  it("reads a price defensively", () => {
    expect(parsePrice("  75.5 ")).toBe(75.5);
    expect(parsePrice("abc")).toBe(0);
    expect(parsePrice(-3)).toBe(0);
    expect(parsePrice(99999999)).toBe(5000);
  });
});

describe("risk dates", () => {
  const today = new Date(2026, 10, 18, 10, 0, 0);
  it("keeps only well-formed dates, at most five, with a cleaned label", () => {
    const raw = JSON.stringify([{ id: "a", label: "  Cousin's\nwedding ", date: "2026-11-20" }, { id: "b", label: "x", date: "2026-02-30" }, { id: "c", label: "", date: "2026-11-21" }, "junk"]);
    expect(parseRiskDates(raw)).toEqual([{ id: "a", label: "Cousin's wedding", date: "2026-11-20" }]);
    expect(parseRiskDates("not json")).toEqual([]);
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `i${i}`, label: "d", date: "2026-12-01" }));
    expect(parseRiskDates(JSON.stringify(many))).toHaveLength(MAX_RISK_DATES);
  });
  it("adds in date order and refuses a sixth or a bad input", () => {
    let list = addRiskDate([], { label: "B", date: "2026-12-02" }, "1")!;
    list = addRiskDate(list, { label: "A", date: "2026-11-30" }, "2")!;
    expect(list.map((d) => d.label)).toEqual(["A", "B"]);
    expect(addRiskDate(list, { label: "", date: "2026-12-02" }, "3")).toBeNull();
    expect(addRiskDate(list, { label: "X", date: "soon" }, "3")).toBeNull();
    const full = Array.from({ length: 5 }, (_, i) => ({ id: `${i}`, label: "d", date: "2026-12-01" }));
    expect(addRiskDate(full, { label: "X", date: "2026-12-02" }, "9")).toBeNull();
  });
  it("reminds only from today to three days ahead, never for the past", () => {
    const dates = [
      { id: "1", label: "past", date: "2026-11-17" },
      { id: "2", label: "today", date: dayKey(today) },
      { id: "3", label: "in three", date: "2026-11-21" },
      { id: "4", label: "in four", date: "2026-11-22" }
    ];
    expect(upcomingRiskDates(dates, today).map((d) => d.label)).toEqual(["today", "in three"]);
  });
});
