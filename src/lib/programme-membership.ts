/**
 * Which programme this device has joined, and the code waiting to be joined.
 *
 * Device-only, like the plans, the privacy lock and the person to call: the code
 * and the organisation's details are kept in the browser's `localStorage` and
 * never sent to the server with an account, never in the data export, never in
 * the coach's prompt. The only request is the lookup of a code, which carries
 * nothing about the person. Everything read back is passed through
 * `sanitiseProgramme`, because storage can be edited and a stored link must never
 * become anything but a plain https, tel or mailto link.
 */
import { type Programme, normaliseCode, sanitiseProgramme } from "@/lib/programme";

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

/** What is in storage, if it is a well-formed programme. Anything else is `null`. */
export function parseStoredProgramme(raw: string | null): Programme | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { programme?: unknown } | null;
    return sanitiseProgramme(data?.programme);
  } catch {
    return null;
  }
}

export function loadProgramme(userId: string): Programme | null {
  try {
    return parseStoredProgramme(window.localStorage.getItem(programmeStorageKey(userId)));
  } catch {
    return null;
  }
}

/** False when the browser refused to store it, so the caller can say so. */
export function saveProgramme(userId: string, programme: Programme): boolean {
  try {
    window.localStorage.setItem(programmeStorageKey(userId), JSON.stringify({ programme }));
  } catch {
    return false;
  }
  announceChange();
  return true;
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
