/**
 * Quiet hours for reminders: a window, often across midnight, in which the app does not nudge. For sleep, and for
 * the people whose "night" is the day (drivers, night-shift staff, nurses). A reminder that would land inside the
 * window waits until it ends.
 *
 * Device only, like the privacy lock and the supporter's number: it lives in this browser's localStorage, is never
 * sent anywhere and is not part of the account, so there is nothing about someone's working pattern for an
 * organisation or a server to learn. Safe for browsers and tests (no storage is touched unless asked).
 */
export type QuietHours = { start: string; end: string };

export const QUIET_HOURS_KEY = "recoverly:quietHours";

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(time: string): number | null {
  const match = TIME.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** A usable window from anything (a stored value may have been edited): two valid, different times, or `null`. */
export function cleanQuietHours(value: unknown): QuietHours | null {
  if (typeof value !== "object" || value === null) return null;
  const { start, end } = value as Record<string, unknown>;
  if (typeof start !== "string" || typeof end !== "string" || start === end) return null;
  return toMinutes(start) !== null && toMinutes(end) !== null ? { start, end } : null;
}

/** Whether a minute of the day (0 to 1439) is inside the window. The end itself is outside. A window can cross midnight. */
function inside(minute: number, quiet: QuietHours): boolean {
  const start = toMinutes(quiet.start) as number;
  const end = toMinutes(quiet.end) as number;
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

export function isQuiet(quiet: QuietHours | null | undefined, now: Date = new Date()): boolean {
  const clean = cleanQuietHours(quiet);
  return clean ? inside(now.getHours() * 60 + now.getMinutes(), clean) : false;
}

/** A reminder time moved out of the window: as it is if it is already outside, otherwise the moment the window ends. */
export function outsideQuiet(time: string, quiet: QuietHours | null | undefined): string {
  const clean = cleanQuietHours(quiet);
  const minute = toMinutes(time);
  if (!clean || minute === null) return time;
  return inside(minute, clean) ? clean.end : time;
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readQuietHours(store: Store | null = browserStore()): QuietHours | null {
  try {
    const raw = store?.getItem(QUIET_HOURS_KEY);
    return raw ? cleanQuietHours(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Save the window, or remove it with `null`. Quietly does nothing where storage is unavailable. */
export function writeQuietHours(quiet: QuietHours | null, store: Store | null = browserStore()): void {
  try {
    const clean = cleanQuietHours(quiet);
    if (clean) store?.setItem(QUIET_HOURS_KEY, JSON.stringify(clean));
    else store?.removeItem(QUIET_HOURS_KEY);
  } catch {
    /* storage is full or blocked: the window simply is not kept */
  }
}
