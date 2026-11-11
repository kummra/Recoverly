/**
 * A look back at the last seven days, for the dashboard.
 *
 * It exists because most of what the app records is a number for today. A week
 * is the shortest stretch in which a pattern shows, and it is the unit that
 * employers, clinics and families actually talk in. It shows what went well
 * and says nothing worse than "hard weeks happen".
 *
 * Rules that must stay true (they are the app's, not just this card's):
 *  - No shaming. Nothing is scored, no red, and a week with drinks in it is
 *    "a hard week", never a failed one. Drink days are shown as plain markers.
 *  - Honest about a short history. Days before the person started using the
 *    app are not "alcohol-free days"; they are simply not counted, so someone
 *    on day four sees four days, not seven.
 *  - It needs at least three days of history before it says anything, since a
 *    "week" of one day is noise.
 *
 * Pure and deterministic: pass `now` in tests.
 */
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";

export type ReviewDay = { date: Date; free: boolean };

export type WeeklyReview = {
  /** One entry per day, oldest first: seven, or fewer for someone who started recently. */
  days: ReviewDay[];
  alcoholFreeDays: number;
  /** Drinks logged this week, shown as mindful check-ins, never as failures. */
  checkIns: number;
  /** Craving sessions this week, and how many passed without a drink. */
  cravings: { total: number; passed: number };
};

export const REVIEW_LENGTH_DAYS = 7;
/** Fewer days than this is not a week worth reviewing yet. */
export const MIN_REVIEW_DAYS = 3;

export function buildWeeklyReview(
  records: Array<{ createdAt: Date }>,
  cravings: Array<{ createdAt: Date; outcome: string }>,
  now: Date = new Date()
): WeeklyReview | null {
  const dates = [...records.map((r) => r.createdAt), ...cravings.map((c) => c.createdAt)];
  if (dates.length === 0) return null;

  const today = startOfDay(now);
  const firstDay = startOfDay(new Date(Math.min(...dates.map((d) => d.getTime()))));
  const span = Math.min(REVIEW_LENGTH_DAYS, differenceInCalendarDays(today, firstDay) + 1);
  if (span < MIN_REVIEW_DAYS) return null;

  const start = addDays(today, -(span - 1));
  const end = addDays(today, 1);
  const inWindow = (d: Date) => d >= start && d < end;

  const drinkDays = new Set(records.filter((r) => inWindow(r.createdAt)).map((r) => startOfDay(r.createdAt).getTime()));
  const days: ReviewDay[] = Array.from({ length: span }, (_, i) => {
    const date = addDays(start, i);
    return { date, free: !drinkDays.has(date.getTime()) };
  });

  const weekCravings = cravings.filter((c) => inWindow(c.createdAt));

  return {
    days,
    alcoholFreeDays: days.filter((d) => d.free).length,
    checkIns: records.filter((r) => inWindow(r.createdAt)).length,
    cravings: {
      total: weekCravings.length,
      passed: weekCravings.filter((c) => c.outcome === "passed").length
    }
  };
}

export type ReviewMessage = "all" | "some" | "none";

/** Which sentence goes under the numbers. */
export function reviewMessage(review: WeeklyReview): ReviewMessage {
  if (review.alcoholFreeDays === review.days.length) return "all";
  return review.alcoholFreeDays > 0 ? "some" : "none";
}
