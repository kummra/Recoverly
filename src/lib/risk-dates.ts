/**
 * Dates a person wants to be ready for (a wedding, a festival, pay day), kept on their device only. A few days
 * before one, the dashboard reminds them of their own plan. Free text about their life: it never leaves the
 * device, is not exported, and is removed when the account is deleted.
 */
export type RiskDate = { id: string; label: string; date: string };

export const MAX_RISK_DATES = 5;
export const MAX_RISK_LABEL = 60;
export const REMIND_DAYS_BEFORE = 3;

export const riskDatesKey = (userId: string) => `recoverly:risk-dates:${userId}`;

function cleanLabel(value: unknown): string {
  // eslint-disable-next-line no-control-regex
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_RISK_LABEL) : "";
}

function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function parseRiskDates(raw: string | null): RiskDate[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const out: RiskDate[] = [];
    for (const item of data) {
      const r = item as Partial<RiskDate> | null;
      const label = cleanLabel(r?.label);
      if (r && typeof r.id === "string" && r.id.length <= 64 && label && validDay(r.date)) out.push({ id: r.id, label, date: r.date });
      if (out.length >= MAX_RISK_DATES) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function addRiskDate(dates: readonly RiskDate[], input: { label: string; date: string }, id: string): RiskDate[] | null {
  const label = cleanLabel(input.label);
  if (!label || !validDay(input.date) || dates.length >= MAX_RISK_DATES) return null;
  return [...dates, { id, label, date: input.date }].sort((a, b) => a.date.localeCompare(b.date));
}

/** A local calendar day as yyyy-MM-dd. */
export function dayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Dates from today up to `within` days ahead (inclusive), soonest first. Past dates are never shown. */
export function upcomingRiskDates(dates: readonly RiskDate[], today: Date, within: number = REMIND_DAYS_BEFORE): RiskDate[] {
  const start = dayKey(today);
  const end = new Date(today);
  end.setDate(end.getDate() + within);
  const last = dayKey(end);
  return dates.filter((d) => d.date >= start && d.date <= last).sort((a, b) => a.date.localeCompare(b.date));
}

export function loadRiskDates(userId: string): RiskDate[] {
  try {
    return parseRiskDates(window.localStorage.getItem(riskDatesKey(userId)));
  } catch {
    return [];
  }
}

export function saveRiskDates(userId: string, dates: readonly RiskDate[]): boolean {
  try {
    window.localStorage.setItem(riskDatesKey(userId), JSON.stringify(dates));
    return true;
  } catch {
    return false;
  }
}

export function clearRiskDates(userId: string): void {
  try {
    window.localStorage.removeItem(riskDatesKey(userId));
  } catch {
    /* nothing stored */
  }
}
