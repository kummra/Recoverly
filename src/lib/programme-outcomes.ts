/**
 * What an organisation may be told about the progress figures its people chose to share
 * (`progress-figures.ts`): averages across a group, never a person, and only for a group
 * of at least `MIN_GROUP`, with each shown percentage rounded to the nearest `ROUND_TO`.
 *
 * The server keeps only four running sums per programme and month. Nothing here can be
 * turned back into one person's numbers: with 20 or more people behind it, an average
 * hides each of them, and the sums are added to, never listed.
 *
 * Plain and safe for browsers and the server.
 */
import { MIN_GROUP, REPORT_MONTHS, ROUND_TO, type CountDisplay, displayCount, isMonthKey, monthKey, shiftMonth } from "@/lib/programme-count";
import type { ProgressFigures } from "@/lib/progress-figures";

/** The running sums for one programme and one month. */
export type OutcomeTotals = {
  /** People who shared figures. */
  n: number;
  /** Their alcohol-free-day percentages, added up. */
  freePctSum: number;
  /** People for whom "drank less than the month before" could be worked out. */
  lessOf: number;
  /** Of those, how many drank less. */
  lessN: number;
};

export const NO_OUTCOMES: OutcomeTotals = { n: 0, freePctSum: 0, lessOf: 0, lessN: 0 };

/** What one person's figures add to the sums. The only thing the server does with them. */
export function contribution(figures: ProgressFigures): OutcomeTotals {
  return { n: 1, freePctSum: figures.freeDayPct, lessOf: figures.lessThanBefore === null ? 0 : 1, lessN: figures.lessThanBefore ? 1 : 0 };
}

export type PercentDisplay = { shown: false } | { shown: true; percent: number };

export type OutcomeDisplay = { people: CountDisplay; freeDays: PercentDisplay; lessThanBefore: PercentDisplay };

function roundedPercent(value: number): number {
  return Math.min(100, Math.round(value / ROUND_TO) * ROUND_TO);
}

/** What may be shown for one month's sums. Each figure has its own group-size check. */
export function displayOutcomes(totals: OutcomeTotals): OutcomeDisplay {
  return {
    people: displayCount(totals.n),
    freeDays: totals.n >= MIN_GROUP ? { shown: true, percent: roundedPercent(totals.freePctSum / totals.n) } : { shown: false },
    lessThanBefore: totals.lessOf >= MIN_GROUP ? { shown: true, percent: roundedPercent((100 * totals.lessN) / totals.lessOf) } : { shown: false }
  };
}

export type OutcomeRow = { month: string; display: OutcomeDisplay };

/** The last few months of figures, newest first. Figures for a month arrive in the month after it, so the newest is last month's. */
export function buildOutcomeRows(byMonth: Readonly<Record<string, OutcomeTotals>>, now: Date, months: number = REPORT_MONTHS): OutcomeRow[] {
  const lastMonth = shiftMonth(monthKey(now), -1);
  return Array.from({ length: months }, (_, i) => {
    const month = shiftMonth(lastMonth, -i);
    return { month, display: displayOutcomes(byMonth[month] ?? NO_OUTCOMES) };
  });
}

/** Keep only well-formed month sums from whatever a database returned. */
export function cleanOutcomes(value: unknown): Record<string, OutcomeTotals> {
  const out: Record<string, OutcomeTotals> = {};
  if (typeof value !== "object" || value === null) return out;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  for (const [month, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isMonthKey(month) || typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const totals = { n: num(r.n), freePctSum: num(r.freePctSum), lessOf: num(r.lessOf), lessN: num(r.lessN) };
    // A sum that cannot be true (more people "less" than were compared, or averages over 100%) is dropped, not shown.
    if (totals.lessN > totals.lessOf || totals.lessOf > totals.n || totals.freePctSum > totals.n * 100) continue;
    out[month] = totals;
  }
  return out;
}
