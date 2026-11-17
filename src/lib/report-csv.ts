/**
 * The monthly report as a CSV file, built only from what the report page already shows:
 * the rounded, thresholded displays. It takes no raw counts and no sums, so a figure the
 * page hides ("fewer than 20", "not shown") can never reach the file either.
 */
import { MIN_GROUP, type ReportRow, monthLabel } from "@/lib/programme-count";
import type { OutcomeRow, PercentDisplay } from "@/lib/programme-outcomes";

/** Quote a cell, and defuse a leading `=`, `+`, `-`, `@` so a spreadsheet never reads text as a formula. */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const pct = (p: PercentDisplay): string => (p.shown ? `${p.percent}` : "not shown");

export function reportCsv(name: string, rows: readonly ReportRow[], outcomes?: readonly OutcomeRow[]): string {
  const lines: string[] = [[csvCell("Programme"), csvCell(name)].join(",")];
  lines.push("");
  lines.push([csvCell("Month"), csvCell("People counted (about)")].join(","));
  for (const row of rows) {
    lines.push([csvCell(monthLabel(row.month)), csvCell(row.display.shown ? row.display.value : `fewer than ${MIN_GROUP}`)].join(","));
  }
  if (outcomes) {
    lines.push("");
    lines.push([csvCell("Month"), csvCell("People sharing (about)"), csvCell("Days with no drink, average (%)"), csvCell("Drank less than the month before (%)")].join(","));
    for (const row of outcomes) {
      lines.push(
        [
          csvCell(monthLabel(row.month)),
          csvCell(row.display.people.shown ? row.display.people.value : `fewer than ${MIN_GROUP}`),
          csvCell(pct(row.display.freeDays)),
          csvCell(pct(row.display.lessThanBefore))
        ].join(",")
      );
    }
  }
  lines.push("");
  lines.push(csvCell("Self-reported, from people who chose to share. Shown only for groups of 20 or more, rounded."));
  return `${lines.join("\r\n")}\r\n`;
}
