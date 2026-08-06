import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths
} from "date-fns";

import type { DrinkRecord } from "@/lib/firestore";

export type AnalyticsSummary = {
  currentMonthTotal: number;
  previousMonthTotal: number;
  dailyAverage: number;
  improvementPercent: number;
  projectionSixMonths: number;
  dailyLineData: Array<{ day: string; quantity: number }>;
  monthlyBarData: Array<{ month: string; total: number }>;
};

function sumQuantities(records: DrinkRecord[]) {
  return records.reduce((total, record) => total + record.quantity, 0);
}

export function buildAnalytics(records: DrinkRecord[]): AnalyticsSummary {
  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const previousStart = startOfMonth(subMonths(now, 1));
  const previousEnd = endOfMonth(subMonths(now, 1));

  const currentMonthRecords = records.filter((item) => item.createdAt >= currentStart && item.createdAt <= currentEnd);
  const previousMonthRecords = records.filter((item) => item.createdAt >= previousStart && item.createdAt <= previousEnd);

  const currentMonthTotal = sumQuantities(currentMonthRecords);
  const previousMonthTotal = sumQuantities(previousMonthRecords);

  const daysElapsed = Math.max(differenceInCalendarDays(now, currentStart) + 1, 1);
  const dailyAverage = currentMonthTotal / daysElapsed;
  const projectionSixMonths = Math.round(dailyAverage * 30 * 6);

  const improvementPercent =
    previousMonthTotal > 0
      ? Number((((previousMonthTotal - currentMonthTotal) / previousMonthTotal) * 100).toFixed(1))
      : 0;

  const dayMap = new Map<string, number>();
  for (const record of currentMonthRecords) {
    const key = format(record.createdAt, "MMM dd");
    dayMap.set(key, (dayMap.get(key) ?? 0) + record.quantity);
  }
  const dailyLineData = Array.from(dayMap.entries()).map(([day, quantity]) => ({ day, quantity }));

  const monthlyBarData = Array.from({ length: 6 }).map((_, index) => {
    const monthDate = subMonths(now, 5 - index);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const total = sumQuantities(records.filter((record) => record.createdAt >= start && record.createdAt <= end));
    return {
      month: format(monthDate, "MMM"),
      total
    };
  });

  return {
    currentMonthTotal,
    previousMonthTotal,
    dailyAverage: Number(dailyAverage.toFixed(1)),
    improvementPercent,
    projectionSixMonths,
    dailyLineData,
    monthlyBarData
  };
}

// ─── Progress & streaks (behavioural design: identity + small wins) ─────────
export type ProgressSummary = {
  /** Days since the last logged drink (0 if a drink was logged today). */
  currentStreakDays: number;
  /** Best alcohol-free run, ever — a personal best that can only go up. */
  longestStreakDays: number;
  /** Alcohol-free calendar days so far this month. */
  alcoholFreeDaysThisMonth: number;
  /** Calendar days elapsed this month (the denominator for "X of Y"). */
  daysElapsedThisMonth: number;
  /** Total logs — reframed as "mindful check-ins", never failures. */
  totalCheckIns: number;
  /** False for a brand-new user with no logs yet (UI shows a gentle start state). */
  hasHistory: boolean;
};

/**
 * Encouraging progress metrics. Streaks are measured in *calendar days* and a
 * "drink day" is any day with at least one logged drink. Pure + deterministic;
 * pass `now` in tests.
 */
export function buildProgress(records: DrinkRecord[], now: Date = new Date()): ProgressSummary {
  const totalCheckIns = records.length;
  const startMonth = startOfMonth(now);
  const daysElapsedThisMonth = differenceInCalendarDays(now, startMonth) + 1;

  if (records.length === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      alcoholFreeDaysThisMonth: daysElapsedThisMonth,
      daysElapsedThisMonth,
      totalCheckIns: 0,
      hasHistory: false
    };
  }

  // Unique drink days (calendar), ascending.
  const dayKeys = new Set<string>();
  for (const r of records) dayKeys.add(format(r.createdAt, "yyyy-MM-dd"));
  const drinkDays = Array.from(dayKeys)
    .map((k) => parseISO(k))
    .sort((a, b) => a.getTime() - b.getTime());

  const lastDrinkDay = drinkDays[drinkDays.length - 1];
  const currentStreakDays = Math.max(differenceInCalendarDays(now, lastDrinkDay), 0);

  // Longest gap of alcohol-free days between consecutive drink days…
  let maxGap = 0;
  for (let i = 1; i < drinkDays.length; i++) {
    const gap = differenceInCalendarDays(drinkDays[i], drinkDays[i - 1]) - 1;
    if (gap > maxGap) maxGap = gap;
  }
  // …and the current ongoing streak counts as a run too.
  const longestStreakDays = Math.max(maxGap, currentStreakDays);

  const drinkDaysThisMonth = drinkDays.filter((d) => d >= startMonth && d <= now).length;
  const alcoholFreeDaysThisMonth = Math.max(daysElapsedThisMonth - drinkDaysThisMonth, 0);

  return {
    currentStreakDays,
    longestStreakDays,
    alcoholFreeDaysThisMonth,
    daysElapsedThisMonth,
    totalCheckIns,
    hasHistory: true
  };
}

// ─── Urge-surfing breath pacer ──────────────────────────────────────────────
// 4-4-6 (in-hold-out). The longer exhale is the point: it's what actually
// engages the parasympathetic response that settles the body down.
export const BREATH_STEPS = [
  { label: "Breathe in", seconds: 4 },
  { label: "Hold", seconds: 4 },
  { label: "Breathe out", seconds: 6 }
] as const;

export const BREATH_CYCLE_SECONDS = BREATH_STEPS.reduce((t, s) => t + s.seconds, 0);

export type BreathPhase = {
  label: (typeof BREATH_STEPS)[number]["label"];
  /** Whole seconds left in this step, counting down to 1. */
  remaining: number;
  /** 0.75–1 — drives the circle's scale so it visibly follows the breath. */
  scale: number;
};

/**
 * Derive the current breath step purely from elapsed seconds, so the pacer has
 * no timer state of its own to drift or get out of sync.
 */
export function breathPhaseAt(elapsedSeconds: number): BreathPhase {
  const pos = ((elapsedSeconds % BREATH_CYCLE_SECONDS) + BREATH_CYCLE_SECONDS) % BREATH_CYCLE_SECONDS;
  let start = 0;
  for (const step of BREATH_STEPS) {
    if (pos < start + step.seconds) {
      const into = pos - start;
      const scale =
        step.label === "Breathe in"
          ? 0.75 + 0.25 * ((into + 1) / step.seconds)
          : step.label === "Hold"
            ? 1
            : 1 - 0.25 * ((into + 1) / step.seconds);
      return { label: step.label, remaining: step.seconds - into, scale };
    }
    start += step.seconds;
  }
  // Unreachable: pos is always < cycle length.
  return { label: BREATH_STEPS[0].label, remaining: BREATH_STEPS[0].seconds, scale: 0.75 };
}

// ─── Daily check-in reminder ────────────────────────────────────────────────

/** Local-day key (YYYY-MM-DD) used to show the nudge at most once per day. */
export function dayKey(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Should the gentle daily check-in nudge be shown right now?
 *
 * True only when the user set a reminder time, that time has passed today, and
 * they haven't already dismissed it today. Deliberately quiet: this is an
 * in-app nudge, never a nag, and it never mentions failure.
 *
 * NOTE: real background/push notifications need a PWA service worker or a
 * native app — this only fires while the app is open.
 */
export function shouldShowReminder(opts: {
  reminderTime?: string; // "HH:MM"
  lastDismissedDayKey?: string | null;
  now?: Date;
}): boolean {
  const { reminderTime, lastDismissedDayKey } = opts;
  const now = opts.now ?? new Date();
  if (!reminderTime) return false;

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(reminderTime);
  if (!match) return false;

  if (lastDismissedDayKey === dayKey(now)) return false;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const minutesTarget = Number(match[1]) * 60 + Number(match[2]);
  return minutesNow >= minutesTarget;
}

export function suggestInsight(summary: AnalyticsSummary) {
  if (summary.currentMonthTotal === 0) {
    return "You have no logged drinks this month. Keep reinforcing the routines helping you stay steady.";
  }

  if (summary.improvementPercent > 0) {
    return `Your monthly intake is down by ${summary.improvementPercent}%. Consistent effort is clearly working.`;
  }

  if (summary.improvementPercent < 0) {
    return "Your current trend is higher than last month. A small pause and support check-in can help reset momentum.";
  }

  return "Your monthly pattern is stable. Small daily choices now can create a visible long-term drop.";
}
