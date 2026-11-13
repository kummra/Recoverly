/**
 * Anonymous progress figures: the second thing a person can choose to add to their
 * organisation's monthly total, on top of being counted (`programme-count.ts`).
 *
 * If they tick it (off unless they do, and only for a programme whose organisation
 * offers it), then once a month, in the same tick that counts them, their device
 * sends two numbers about the month that just ended:
 *   - the share of that month's days on which no drink was logged (0 to 100), and
 *   - whether they drank less than in the month before (yes, no, or "nothing to compare").
 * The server only adds them into the programme's running sums (`programme-outcomes.ts`);
 * no name, account, timestamp or list is kept, so nothing can be read back about one
 * person. The organisation sees averages, and only for 20 or more people.
 *
 * Self-reported logs are weak evidence and the report says so. This file is plain and
 * safe for browsers and the server: it works out the two numbers from the records and
 * checks what arrives. It never talks to a database.
 */
import { differenceInCalendarDays, endOfMonth, format, startOfDay, startOfMonth, subMonths } from "date-fns";

import { shiftMonth } from "@/lib/programme-count";

/** A month with fewer counted days than this says too little about a person to send. */
export const MIN_DAYS_FOR_FIGURES = 7;

export type ProgressFigures = {
  /** The month the figures describe ("2026-10"): the last month that finished. */
  month: string;
  /** Whole percent of that month's counted days with no drink logged, 0 to 100. */
  freeDayPct: number;
  /** Did they drink less (in ml) than the month before? `null` when there is nothing to compare with. */
  lessThanBefore: boolean | null;
};

/** What the figures are built from: when each drink was logged, and how much. */
type Entry = { createdAt: Date; quantity: number };

type MonthStats = { countedDays: number; drinkDays: number; totalMl: number };

/**
 * One calendar month's numbers. Days before the person's first record are not counted
 * (they had not started, so they were not "alcohol-free days"), the same rule the weekly
 * look-back follows. `null` when too few days are left to say anything.
 */
function statsForMonth(entries: readonly Entry[], monthStart: Date, firstDay: Date): MonthStats | null {
  const end = endOfMonth(monthStart);
  const first = firstDay > monthStart ? firstDay : monthStart;
  if (first > end) return null;
  const countedDays = differenceInCalendarDays(end, first) + 1;
  if (countedDays < MIN_DAYS_FOR_FIGURES) return null;

  const days = new Set<string>();
  let totalMl = 0;
  for (const entry of entries) {
    if (entry.createdAt < first || entry.createdAt > end) continue;
    days.add(format(entry.createdAt, "yyyy-MM-dd"));
    totalMl += Math.max(0, entry.quantity);
  }
  return { countedDays, drinkDays: days.size, totalMl };
}

/**
 * The two numbers for the month before `now`, or `null` when this person has too little
 * history to send anything honest (no records, or they started this month or last week).
 */
export function buildProgressFigures(entries: readonly Entry[], now: Date = new Date()): ProgressFigures | null {
  if (entries.length === 0) return null;
  const firstDay = startOfDay(entries.reduce((min, e) => (e.createdAt < min ? e.createdAt : min), entries[0].createdAt));

  const lastMonth = startOfMonth(subMonths(now, 1));
  const last = statsForMonth(entries, lastMonth, firstDay);
  if (!last) return null;

  const before = statsForMonth(entries, startOfMonth(subMonths(now, 2)), firstDay);
  // "Less than before" needs a month before to compare with, and one in which they drank.
  const lessThanBefore = before && before.totalMl > 0 ? last.totalMl < before.totalMl : null;

  return {
    month: format(lastMonth, "yyyy-MM"),
    freeDayPct: Math.round((100 * (last.countedDays - last.drinkDays)) / last.countedDays),
    lessThanBefore
  };
}

/**
 * What the server accepts: figures for exactly the month before the one it says it is
 * (so a month cannot be back-filled or a future one invented), a whole percent, and a
 * yes, no or "nothing to compare". Anything else is not figures. Never throws.
 */
export function cleanFigures(input: unknown, serverMonth: string): ProgressFigures | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;
  if (raw.month !== shiftMonth(serverMonth, -1)) return null;
  const pct = raw.freeDayPct;
  if (typeof pct !== "number" || !Number.isInteger(pct) || pct < 0 || pct > 100) return null;
  const less = raw.lessThanBefore;
  if (less !== null && typeof less !== "boolean") return null;
  return { month: raw.month, freeDayPct: pct, lessThanBefore: less };
}
