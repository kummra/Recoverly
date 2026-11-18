/**
 * A roll-up for an organisation that runs several programme codes (an NGO network's districts, a state's
 * colleges). It never shows more than the districts already show: each district's figure is used only if it
 * reaches the group size ON ITS OWN (the same `displayCount` rule, already rounded), so the total is a sum of
 * rounded, thresholded numbers and a small district is left out rather than hidden inside a big total.
 */
import { type CountDisplay, type ReportRow, REPORT_MONTHS, displayCount, monthKey, shiftMonth } from "@/lib/programme-count";

export type RollUpRow = ReportRow & { districtsShown: number; districtsTotal: number };

export function rollUpRows(perProgramme: Readonly<Record<string, Readonly<Record<string, number>>>>, now: Date, months: number = REPORT_MONTHS): RollUpRow[] {
  const codes = Object.keys(perProgramme);
  const thisMonth = monthKey(now);
  return Array.from({ length: months }, (_, i) => {
    const month = shiftMonth(thisMonth, -i);
    let sum = 0;
    let shown = 0;
    for (const code of codes) {
      const d = displayCount(perProgramme[code]?.[month] ?? 0);
      if (d.shown) {
        sum += d.value;
        shown += 1;
      }
    }
    const display: CountDisplay = shown > 0 ? { shown: true, value: sum } : { shown: false };
    return { month, display, districtsShown: shown, districtsTotal: codes.length };
  });
}
