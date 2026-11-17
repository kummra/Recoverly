import { describe, expect, it } from "vitest";

import { buildReportRows } from "@/lib/programme-count";
import { buildOutcomeRows } from "@/lib/programme-outcomes";
import { csvCell, reportCsv } from "@/lib/report-csv";

const NOW = new Date("2026-11-12T09:00:00Z");

describe("csvCell", () => {
  it("quotes what needs it and defuses formulas", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('a, "b"')).toBe('"a, ""b"""');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell(42)).toBe("42");
  });
});

describe("reportCsv", () => {
  it("shows a figure only where the page does, and never a count below the group size", () => {
    const rows = buildReportRows({ "2026-10": 7, "2026-09": 44 }, NOW);
    const csv = reportCsv("Acme", rows);
    expect(csv).toContain("fewer than 20");
    expect(csv).toContain("45"); // 44 rounded to 5
    expect(csv).not.toMatch(/\b7\b/);
    expect(csv).not.toMatch(/\b44\b/);
  });

  it("adds the progress table only when given, hiding small groups", () => {
    const rows = buildReportRows({}, NOW);
    expect(reportCsv("Acme", rows)).not.toContain("Days with no drink");
    const outcomes = buildOutcomeRows({ "2026-10": { n: 30, freePctSum: 30 * 62, lessOf: 20, lessN: 30 }, "2026-09": { n: 3, freePctSum: 150, lessOf: 1, lessN: 3 } }, NOW);
    const csv = reportCsv("Acme", rows, outcomes);
    expect(csv).toContain("Days with no drink");
    expect(csv).toContain("not shown");
  });

  it("neutralises a programme name that looks like a formula, and ends with the caveat", () => {
    const csv = reportCsv("=cmd|' /C calc'!A0", buildReportRows({}, NOW));
    expect(csv.split("\r\n")[0]).toBe("Programme,'=cmd|' /C calc'!A0");
    expect(csv).toContain("Self-reported");
  });
});
