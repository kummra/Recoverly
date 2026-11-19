/**
 * The anonymous monthly one-question survey (the "pulse"), and what an organisation may be told about it. It is the same idea as the
 * headcount and the progress figures (`programme-count.ts`, `programme-outcomes.ts`), and it follows the same rules:
 *
 *  - Off until a person ticks it, and only for a person who is counted in a programme that offers it. They can untick it at any time.
 *  - The question is fixed, written by us and the same for every programme, so no organisation can use it to ask about someone's
 *    drinking, health or anything else. It asks only whether the person feels they could ask for help without being judged.
 *  - What is sent is a number from 1 to 5 and the programme code. No name, no account, no time of day. The server adds one to a count
 *    for that answer and that month, and keeps nothing else (no uid, no list, no timestamp).
 *  - An organisation is shown a month only when at least `MIN_GROUP` people answered, with the number of answers rounded to the nearest
 *    `ROUND_TO`, the share who agree (4 or 5) rounded to the nearest 5 per cent, and the average to one decimal place. Never live,
 *    never a single answer, never a list.
 *
 * Plain and safe for browsers and the server.
 */
import { MIN_GROUP, REPORT_MONTHS, ROUND_TO, isMonthKey, monthKey, shiftMonth } from "@/lib/programme-count";

export const PULSE_ANSWERS = [1, 2, 3, 4, 5] as const;
export type PulseAnswer = (typeof PULSE_ANSWERS)[number];

export const isPulseAnswer = (value: unknown): value is PulseAnswer => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;

/** How many people gave each answer in one month: position 0 is the count for "1", position 4 for "5". */
export type PulseCounts = readonly [number, number, number, number, number];

export const NO_PULSE: PulseCounts = [0, 0, 0, 0, 0];

const clean = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);

/** Keep only well-formed months and counts from whatever a database returned: `{ "2026-11": { a1: 2, a5: 7 } }`. */
export function cleanPulseMonths(value: unknown): Record<string, PulseCounts> {
  const result: Record<string, PulseCounts> = {};
  if (typeof value !== "object" || value === null) return result;
  for (const [month, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isMonthKey(month) || typeof raw !== "object" || raw === null) continue;
    const row = raw as Record<string, unknown>;
    result[month] = [clean(row.a1), clean(row.a2), clean(row.a3), clean(row.a4), clean(row.a5)];
  }
  return result;
}

export type PulseDisplay = { shown: false } | { shown: true; answers: number; agreePercent: number; average: number };
export type PulseRow = { month: string; display: PulseDisplay };

/** What may be shown for one month. Below the group size, nothing at all. */
export function displayPulse(counts: PulseCounts | undefined): PulseDisplay {
  const row = counts ?? NO_PULSE;
  const answers = row.reduce((sum, n) => sum + n, 0);
  if (answers < MIN_GROUP) return { shown: false };
  const agree = row[3] + row[4];
  const weighted = row.reduce((sum, n, index) => sum + n * (index + 1), 0);
  return {
    shown: true,
    answers: Math.round(answers / ROUND_TO) * ROUND_TO,
    agreePercent: Math.min(100, Math.round((100 * agree) / answers / ROUND_TO) * ROUND_TO),
    average: Math.round((weighted / answers) * 10) / 10
  };
}

/** The last few months, newest first, ending with the month `now` falls in. */
export function buildPulseRows(months: Readonly<Record<string, PulseCounts>>, now: Date, count: number = REPORT_MONTHS): PulseRow[] {
  const thisMonth = monthKey(now);
  return Array.from({ length: count }, (_, i) => {
    const month = shiftMonth(thisMonth, -i);
    return { month, display: displayPulse(months[month]) };
  });
}
