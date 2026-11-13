/**
 * The anonymous monthly headcount: the one number an organisation can receive about
 * its people, and only if its people choose it.
 *
 * What is counted: once a month, a person who ticked "count me" (off by default,
 * their own choice, undone with one tap) opens Recoverly, and their device adds
 * one to a total for the programme and that month. Nothing else is sent, and
 * nothing is kept about who sent it: no name, no account, no list. So the figure
 * can say "about 25 people used Recoverly in October" and cannot say who.
 *
 * What the organisation is shown is limited so that the number cannot single
 * anyone out:
 *  - a figure below `MIN_GROUP` is never shown, only "fewer than 20";
 *  - a figure that is shown is rounded to the nearest `ROUND_TO`;
 *  - it is a monthly total, never live, so a person joining cannot be seen as a +1.
 * The English privacy policy states these numbers (`privacy.s12Body`) and
 * `privacy-policy.test.ts` fails if they and the policy ever disagree.
 *
 * Plain and safe for browsers and the server. Nothing here talks to a database.
 */

/** The fewest people a figure may stand for before it is shown at all. */
export const MIN_GROUP = 20;
/** Shown figures are rounded to the nearest multiple of this. */
export const ROUND_TO = 5;
/** How many months a report lists. */
export const REPORT_MONTHS = 6;

/** The pair of numbers in "2026-11": a year and a month (1 to 12), or `null`. */
export function parseMonthKey(value: unknown): { year: number; month: number } | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
}

export function isMonthKey(value: unknown): value is string {
  return parseMonthKey(value) !== null;
}

/**
 * The calendar month a moment falls in for people in India, as "2026-11". The
 * server decides which month a tick counts for (a device never says), so a month
 * cannot be back-filled.
 */
export function monthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

/** The month `delta` months before (negative) or after this one. */
export function shiftMonth(key: string, delta: number): string {
  const parsed = parseMonthKey(key);
  if (!parsed) throw new Error(`not a month: ${key}`);
  const index = parsed.year * 12 + (parsed.month - 1) + delta;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

/** "Nov 2026". Always English: the organisation's report page is English. */
export function monthLabel(key: string): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short", year: "numeric" }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, 1)));
}

export type CountDisplay = { shown: false } | { shown: true; value: number };

/** What an organisation may be told about a total of `people`: nothing below the group size, a rounded figure above it. */
export function displayCount(people: number): CountDisplay {
  if (!Number.isFinite(people) || people < MIN_GROUP) return { shown: false };
  return { shown: true, value: Math.round(people / ROUND_TO) * ROUND_TO };
}

export type ReportRow = { month: string; display: CountDisplay };

/** The last few months, newest first, ending with the month `now` falls in. Months with no ticks show as "not shown". */
export function buildReportRows(active: Readonly<Record<string, number>>, now: Date, months: number = REPORT_MONTHS): ReportRow[] {
  const thisMonth = monthKey(now);
  return Array.from({ length: months }, (_, i) => {
    const month = shiftMonth(thisMonth, -i);
    return { month, display: displayCount(active[month] ?? 0) };
  });
}

/** Keep only well-formed month → count pairs from whatever a database returned. */
export function cleanActiveCounts(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof value !== "object" || value === null) return out;
  for (const [month, count] of Object.entries(value as Record<string, unknown>)) {
    if (isMonthKey(month) && typeof count === "number" && Number.isFinite(count) && count >= 0) out[month] = Math.floor(count);
  }
  return out;
}
