/**
 * Which programme this device has joined, whether the person chose to be counted in
 * its anonymous monthly total, and the code waiting to be joined.
 *
 * Device-only, like the plans, the privacy lock and the person to call: the code,
 * the organisation's details and the person's choice are kept in the browser's
 * `localStorage` and never in the data export or the coach's prompt. The requests
 * are the lookup of a code (which carries nothing about the person) and, only if
 * they ticked the box, one monthly tick (`programme-headcount.ts`). Everything read
 * back is passed through `sanitiseProgramme`, because storage can be edited and a
 * stored link must never become anything but a plain https, tel or mailto link.
 */
import { type Programme, normaliseCode, sanitiseProgramme } from "@/lib/programme";
import { isMonthKey } from "@/lib/programme-count";

/** A code seen on the join page by someone who still has to sign in. Not per person:
 *  nobody is signed in yet. Cleared as soon as it is used, declined or turns out wrong. */
export const PENDING_CODE_KEY = "recoverly:programme-pending";

/** Fired on `window` when this tab joins or leaves a programme. The browser's own
 *  `storage` event only reaches OTHER tabs, so without this the dashboard card would
 *  not notice a join made a moment ago in the same tab. */
export const PROGRAMME_CHANGED_EVENT = "recoverly:programme-changed";

function announceChange(): void {
  try {
    if (typeof window.dispatchEvent === "function") window.dispatchEvent(new Event(PROGRAMME_CHANGED_EVENT));
  } catch {
    /* telling other components is a courtesy; it must never undo the save */
  }
}

export function programmeStorageKey(userId: string): string {
  return `recoverly:programme:${userId}`;
}

/** The programme joined here, and the person's choice about being counted in its monthly total. */
export type Membership = {
  programme: Programme;
  /** They ticked "count me". Only ever true for a programme that offers the headcount. Off unless chosen. */
  counted: boolean;
  /** The month ("2026-11") this device last sent its tick for, so it sends one a month and no more. */
  countedMonth: string | null;
};

/** What is in storage, if it is a well-formed membership. Anything else is `null`. */
export function parseStoredMembership(raw: string | null): Membership | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { programme?: unknown; counted?: unknown; countedMonth?: unknown } | null;
    const programme = sanitiseProgramme(data?.programme);
    if (!programme) return null;
    // A choice to be counted only means anything where the organisation offers it.
    const counted = data?.counted === true && programme.headcount === true;
    return { programme, counted, countedMonth: counted && isMonthKey(data?.countedMonth) ? (data?.countedMonth as string) : null };
  } catch {
    return null;
  }
}

/** What is in storage, if it is a well-formed programme. Anything else is `null`. */
export function parseStoredProgramme(raw: string | null): Programme | null {
  return parseStoredMembership(raw)?.programme ?? null;
}

export function loadMembership(userId: string): Membership | null {
  try {
    return parseStoredMembership(window.localStorage.getItem(programmeStorageKey(userId)));
  } catch {
    return null;
  }
}

export function loadProgramme(userId: string): Programme | null {
  return loadMembership(userId)?.programme ?? null;
}

function writeMembership(userId: string, membership: Membership): boolean {
  const stored: Record<string, unknown> = { programme: membership.programme };
  if (membership.counted && membership.programme.headcount === true) {
    stored.counted = true;
    if (membership.countedMonth) stored.countedMonth = membership.countedMonth;
  }
  try {
    window.localStorage.setItem(programmeStorageKey(userId), JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

/**
 * Keep this programme. `options.counted` is the person's choice about the monthly
 * total (a new join passes it; leaving it out keeps whatever they chose before for
 * the same programme, or "not counted" for a different one, which is what a refresh
 * of the programme's details from the server needs). Counting is never on unless the
 * programme offers it. False when the browser refused to store it, so the caller can
 * say so.
 */
export function saveProgramme(userId: string, programme: Programme, options: { counted?: boolean } = {}): boolean {
  const existing = loadMembership(userId);
  const same = existing?.programme.code === programme.code;
  const counted = programme.headcount === true && (options.counted ?? (same ? existing.counted : false));
  const countedMonth = same && counted && options.counted === undefined ? existing.countedMonth : null;
  if (!writeMembership(userId, { programme, counted, countedMonth })) return false;
  announceChange();
  return true;
}

/**
 * The person ticks or unticks "count me" for the programme they are in. Ticking starts
 * afresh (the next time the dashboard opens, this month's tick is sent); unticking
 * stops all further ticks at once. False if there is no programme or storage refused.
 */
export function setCounted(userId: string, counted: boolean): boolean {
  const existing = loadMembership(userId);
  if (!existing) return false;
  const next = counted && existing.programme.headcount === true;
  if (!writeMembership(userId, { programme: existing.programme, counted: next, countedMonth: null })) return false;
  announceChange();
  return true;
}

/** Remember the month this device last sent its tick for (or `null` to forget it). Quiet: nothing on screen changes. */
export function markCountedMonth(userId: string, month: string | null): boolean {
  const existing = loadMembership(userId);
  if (!existing || !existing.counted) return false;
  return writeMembership(userId, { ...existing, countedMonth: month });
}

/** Forget the programme. Called when someone leaves it and on account deletion
 *  (a device-only value is out of the server's reach, so "delete my data" must
 *  include it). Never throws. */
export function clearProgramme(userId: string): void {
  try {
    window.localStorage.removeItem(programmeStorageKey(userId));
  } catch {
    /* nothing stored, or storage unavailable: nothing to remove */
  }
  announceChange();
}

export function loadPendingCode(): string | null {
  try {
    return normaliseCode(window.localStorage.getItem(PENDING_CODE_KEY));
  } catch {
    return null;
  }
}

export function savePendingCode(code: string): boolean {
  const clean = normaliseCode(code);
  if (!clean) return false;
  try {
    window.localStorage.setItem(PENDING_CODE_KEY, clean);
    return true;
  } catch {
    return false;
  }
}

export function clearPendingCode(): void {
  try {
    window.localStorage.removeItem(PENDING_CODE_KEY);
  } catch {
    /* nothing to remove */
  }
}

export type LookupResult =
  | { ok: true; programme: Programme }
  /** invalid: not shaped like a code. not-found: no such programme. busy: asked too often.
   *  network: anything else, including an answer we could not use. */
  | { ok: false; reason: "invalid" | "not-found" | "busy" | "network" };

/** Ask the server for the programme behind a code. Sends the code and nothing else. */
export async function lookupProgramme(code: string, options: { fetchImpl?: typeof fetch; signal?: AbortSignal } = {}): Promise<LookupResult> {
  const clean = normaliseCode(code);
  if (!clean) return { ok: false, reason: "invalid" };
  const doFetch = options.fetchImpl ?? fetch;
  try {
    const response = await doFetch(`/api/programme?code=${encodeURIComponent(clean)}`, { signal: options.signal, credentials: "omit" });
    if (response.status === 404) return { ok: false, reason: "not-found" };
    if (response.status === 400) return { ok: false, reason: "invalid" };
    if (response.status === 429) return { ok: false, reason: "busy" };
    if (!response.ok) return { ok: false, reason: "network" };
    const data = (await response.json()) as { programme?: unknown };
    const programme = sanitiseProgramme(data.programme);
    return programme && programme.code === clean ? { ok: true, programme } : { ok: false, reason: "network" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
