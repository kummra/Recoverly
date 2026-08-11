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

// ─── Money & health saved ───────────────────────────────────────────────────
// Rough but honest: per-ml cost and calories by drink type, Indian retail
// ballpark in INR. These are estimates for motivation, not accounting — the UI
// says so. Calories use standard ABV-to-kcal figures (7 kcal per gram ethanol).
const DRINK_FACTS: Record<string, { rupeesPerMl: number; kcalPerMl: number }> = {
  beer: { rupeesPerMl: 0.45, kcalPerMl: 0.43 },
  wine: { rupeesPerMl: 1.2, kcalPerMl: 0.83 },
  whiskey: { rupeesPerMl: 3.0, kcalPerMl: 2.5 },
  vodka: { rupeesPerMl: 2.6, kcalPerMl: 2.3 },
  other: { rupeesPerMl: 1.0, kcalPerMl: 1.0 }
};

export type SavingsSummary = {
  /** Rupees not spent this month versus the busiest earlier month. */
  rupeesSaved: number;
  kcalAvoided: number;
  /** The month we're comparing against, e.g. "Jun". */
  baselineMonth: string | null;
  /** False when there's no earlier month to compare with yet. */
  hasBaseline: boolean;
};

function costOf(records: DrinkRecord[]) {
  return records.reduce(
    (acc, r) => {
      const f = DRINK_FACTS[r.type] ?? DRINK_FACTS.other;
      acc.rupees += r.quantity * f.rupeesPerMl;
      acc.kcal += r.quantity * f.kcalPerMl;
      return acc;
    },
    { rupees: 0, kcal: 0 }
  );
}

/**
 * Compare this month against the user's heaviest previous month. Framing it
 * against their own worst month (not an arbitrary target) keeps it truthful and
 * personal — and it can only ever show a gain, never a scolding deficit.
 */
export function buildSavings(records: DrinkRecord[], now: Date = new Date()): SavingsSummary {
  const currentStart = startOfMonth(now);
  const current = costOf(records.filter((r) => r.createdAt >= currentStart));

  let best: { month: string; rupees: number; kcal: number } | null = null;
  for (let i = 1; i <= 6; i++) {
    const d = subMonths(now, i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const c = costOf(records.filter((r) => r.createdAt >= start && r.createdAt <= end));
    if (c.rupees > 0 && (!best || c.rupees > best.rupees)) {
      best = { month: format(d, "MMM"), rupees: c.rupees, kcal: c.kcal };
    }
  }

  if (!best) {
    return { rupeesSaved: 0, kcalAvoided: 0, baselineMonth: null, hasBaseline: false };
  }

  return {
    rupeesSaved: Math.max(0, Math.round(best.rupees - current.rupees)),
    kcalAvoided: Math.max(0, Math.round(best.kcal - current.kcal)),
    baselineMonth: best.month,
    hasBaseline: true
  };
}

// ─── Milestones ─────────────────────────────────────────────────────────────
export const MILESTONE_DAYS = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const;

export type Milestone = {
  days: number;
  labelKey: string;
  reached: boolean;
};

/** Identity-framed, never a scoreboard: each one names who they're becoming.
 *  Values are i18n keys — the UI translates them at render time. */
const MILESTONE_LABEL_KEYS: Record<number, string> = {
  1: "milestone.day1",
  3: "milestone.day3",
  7: "milestone.week1",
  14: "milestone.week2",
  30: "milestone.month1",
  60: "milestone.month2",
  90: "milestone.month3",
  180: "milestone.month6",
  365: "milestone.year1"
};

export function buildMilestones(currentStreakDays: number, longestStreakDays: number): {
  milestones: Milestone[];
  /** The next one within reach, or null once they're all reached. */
  next: Milestone | null;
  daysToNext: number | null;
} {
  const best = Math.max(currentStreakDays, longestStreakDays);
  const milestones = MILESTONE_DAYS.map((days) => ({
    days,
    labelKey: MILESTONE_LABEL_KEYS[days] ?? "milestone.generic",
    reached: best >= days
  }));
  const next = milestones.find((m) => !m.reached) ?? null;
  return { milestones, next, daysToNext: next ? next.days - currentStreakDays : null };
}

// ─── Trigger patterns ───────────────────────────────────────────────────────
export type TriggerInsight = {
  /** i18n key for the pattern, e.g. "trigger.fridays". */
  labelKey: string;
  /** Present only for mood patterns: the user's own wording, untranslated. */
  mood?: string;
  count: number;
  /** Share of all logged drinks, 0–1. */
  share: number;
};

const DAY_KEYS = [
  "trigger.sundays",
  "trigger.mondays",
  "trigger.tuesdays",
  "trigger.wednesdays",
  "trigger.thursdays",
  "trigger.fridays",
  "trigger.saturdays"
];

function partOfDayKey(h: number): string {
  if (h < 6) return "trigger.lateNights";
  if (h < 12) return "trigger.mornings";
  if (h < 18) return "trigger.afternoons";
  return "trigger.evenings";
}

/**
 * Surface the strongest day-of-week, time-of-day and mood patterns. Only
 * returns a pattern if it's meaningfully above chance and backed by enough
 * records — a "pattern" from three drinks would be noise dressed as insight.
 */
export function buildTriggerInsights(records: DrinkRecord[], minRecords = 8): TriggerInsight[] {
  if (records.length < minRecords) return [];

  const tally = (keys: string[]) => {
    const m = new Map<string, number>();
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  };

  const out: TriggerInsight[] = [];
  const total = records.length;

  const day = tally(records.map((r) => DAY_KEYS[r.createdAt.getDay()]));
  // 1/7 is chance for a weekday; require a clear lean past it.
  if (day && day[1] / total >= 0.25) out.push({ labelKey: day[0], count: day[1], share: day[1] / total });

  const time = tally(records.map((r) => partOfDayKey(r.createdAt.getHours())));
  if (time && time[1] / total >= 0.4) out.push({ labelKey: time[0], count: time[1], share: time[1] / total });

  const moods = records.map((r) => r.mood?.trim().toLowerCase()).filter((m): m is string => Boolean(m));
  if (moods.length >= Math.max(4, minRecords / 2)) {
    const mood = tally(moods);
    // The mood itself is the user's own words — pass it through as a parameter
    // rather than trying to translate it.
    if (mood && mood[1] >= 3)
      out.push({ labelKey: "trigger.mood", mood: mood[0], count: mood[1], share: mood[1] / total });
  }

  return out;
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

/** Returns an i18n key plus any interpolation values, so the wording follows
 *  the reader's language rather than being baked in here. */
export function suggestInsight(summary: AnalyticsSummary): {
  key: string;
  params?: Record<string, string | number>;
} {
  if (summary.currentMonthTotal === 0) return { key: "insight.none" };
  if (summary.improvementPercent > 0)
    return { key: "insight.down", params: { percent: summary.improvementPercent } };
  if (summary.improvementPercent < 0) return { key: "insight.up" };
  return { key: "insight.stable" };
}

// ─── Looking forward, not just back ─────────────────────────────────────────

export type UpcomingRisk = {
  /** The matched pattern, e.g. "trigger.fridays" or "trigger.evenings". */
  labelKey: string;
  /** Share of their logged drinks that fall in this window, 0–1. */
  share: number;
  /** "day" fires from the moment the day starts; "time" only inside the window. */
  kind: "day" | "time";
};

const PART_OF_DAY_RANGES: Record<string, [number, number]> = {
  "trigger.lateNights": [0, 6],
  "trigger.mornings": [6, 12],
  "trigger.afternoons": [12, 18],
  "trigger.evenings": [18, 24]
};

/**
 * Turn the retrospective trigger patterns into something the app can act on
 * *before* a hard window rather than reporting it afterwards.
 *
 * Deliberately conservative:
 * - Only fires on patterns `buildTriggerInsights` already judged significant,
 *   so it inherits the "enough records, clearly above chance" bar.
 * - Mood patterns are excluded — we can't know today's mood, and guessing it
 *   would be both wrong and intrusive.
 * - A time window matches only while you're actually in it, so an evening
 *   pattern doesn't nag at breakfast.
 *
 * This is a prompt to prepare, never a prediction that someone *will* drink.
 */
export function findUpcomingRisk(
  triggers: TriggerInsight[],
  now: Date = new Date()
): UpcomingRisk | null {
  const dayMatch = triggers.find(
    (t) => t.labelKey === DAY_KEYS[now.getDay()] && !t.mood
  );
  if (dayMatch) return { labelKey: dayMatch.labelKey, share: dayMatch.share, kind: "day" };

  const hour = now.getHours();
  const timeMatch = triggers.find((t) => {
    const range = PART_OF_DAY_RANGES[t.labelKey];
    return range && hour >= range[0] && hour < range[1];
  });
  if (timeMatch) return { labelKey: timeMatch.labelKey, share: timeMatch.share, kind: "time" };

  return null;
}

// ─── Cravings ridden out ────────────────────────────────────────────────────

export type CravingSummary = {
  total: number;
  /** Episodes that ended without a drink. */
  passed: number;
  /** 0–1, or null when there is nothing to divide by. */
  passRate: number | null;
  /** Median seconds to ride one out — median, not mean, so one long night
   *  doesn't distort the number someone leans on during a craving. */
  medianSeconds: number | null;
  averageIntensity: number | null;
};

export function buildCravingSummary(
  events: Array<{ intensity: number; outcome: string; secondsElapsed?: number }>
): CravingSummary {
  const total = events.length;
  if (total === 0) {
    return { total: 0, passed: 0, passRate: null, medianSeconds: null, averageIntensity: null };
  }

  const passed = events.filter((e) => e.outcome === "passed").length;

  // Only episodes that actually passed tell us how long riding one out takes.
  const durations = events
    .filter((e) => e.outcome === "passed" && typeof e.secondsElapsed === "number")
    .map((e) => e.secondsElapsed as number)
    .sort((a, b) => a - b);
  const medianSeconds = durations.length
    ? durations.length % 2
      ? durations[(durations.length - 1) / 2]
      : Math.round((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2)
    : null;

  const averageIntensity =
    Math.round((events.reduce((sum, e) => sum + e.intensity, 0) / total) * 10) / 10;

  return { total, passed, passRate: passed / total, medianSeconds, averageIntensity };
}
