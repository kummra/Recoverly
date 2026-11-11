/**
 * The privacy lock: an optional PIN in front of the app, on this device only.
 *
 * Who it is for: people who share a phone with family, or who do not want
 * someone who picks theirs up to be able to open a recovery app. Hiding it is
 * part of why many people cannot ask for help, and employers and colleges are
 * told the support is private.
 *
 * What it is, said plainly (the settings card says the same): a screen that
 * keeps a casual onlooker out. It is not encryption. Someone with the phone
 * unlocked and the skill to open the browser's developer tools could remove it.
 * The PIN is kept as a salted hash and never leaves the device, and nothing
 * else here changes who can read the person's data.
 *
 * It must never become a trap. A forgotten PIN is cleared by signing out, which
 * removes the lock (the data stays in the account); the lock screen always
 * shows the helplines; and an unreadable or corrupt setting means "no lock",
 * never "locked for good".
 *
 * Everything that can be decided without a browser lives here so it can be
 * tested. Free of server-only imports.
 */

export const LOCK_KEY = "recoverly:lock";
export const ATTEMPTS_KEY = "recoverly:lock:attempts";
/** Kept in sessionStorage: a new tab or a relaunched installed app starts locked. */
export const ACTIVITY_KEY = "recoverly:lock:active";

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/** Minutes of no use (or away) before the lock closes. Shorter than a minute
 *  would lock while someone is reading a guide. */
export const IDLE_OPTIONS = [1, 5, 15] as const;
export type IdleMinutes = (typeof IDLE_OPTIONS)[number];
export const DEFAULT_IDLE_MINUTES: IdleMinutes = 1;

/** Enough to be a hash and not a lookup, light enough for a low-end phone to
 *  check in well under a second. A four-digit PIN has ten thousand
 *  possibilities whatever the count, which is why this is a screen and not a
 *  safe. */
export const PBKDF2_ITERATIONS = 100_000;

/** Wrong guesses allowed before the app makes the person wait. */
export const FREE_ATTEMPTS = 5;
export const BASE_WAIT_SECONDS = 30;
export const MAX_WAIT_SECONDS = 900;

export type LockConfig = {
  salt: string;
  hash: string;
  iterations: number;
  idleMinutes: IdleMinutes;
};

/** Just what the lock needs from `Storage`, so a test can pass a plain object. */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// ─── PIN rules ──────────────────────────────────────────────────────────────

/** A run like 1234 or 9876, or one digit repeated: the first things a person
 *  who has picked up the phone will try. */
export function isEasyPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const steps = [...pin].slice(1).map((digit, i) => Number(digit) - Number(pin[i]));
  return steps.every((step) => step === 1) || steps.every((step) => step === -1);
}

export type PinProblem = "length" | "easy";

/** Why a new PIN cannot be used, or `null` if it can. */
export function checkNewPin(pin: string): PinProblem | null {
  if (!/^\d+$/.test(pin) || pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH) return "length";
  if (isEasyPin(pin)) return "easy";
  return null;
}

// ─── Hashing ────────────────────────────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Compare without stopping at the first difference. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function createLockConfig(pin: string, idleMinutes: IdleMinutes): Promise<LockConfig> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
  return { salt: toBase64(salt), hash: toBase64(hash), iterations: PBKDF2_ITERATIONS, idleMinutes };
}

export async function verifyPin(pin: string, config: Pick<LockConfig, "salt" | "hash" | "iterations">): Promise<boolean> {
  try {
    const derived = await derive(pin, fromBase64(config.salt), config.iterations);
    return sameBytes(derived, fromBase64(config.hash));
  } catch {
    return false;
  }
}

// ─── Reading and writing the setting ────────────────────────────────────────

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * What is in storage, if it is a usable lock. Anything else (missing, damaged,
 * edited by hand) is `null`, meaning no lock: a broken setting must never be
 * able to lock someone out of their own app.
 */
export function parseLockConfig(raw: string | null): LockConfig | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const { salt, hash, iterations, idleMinutes } = data as Record<string, unknown>;
  if (typeof salt !== "string" || !BASE64.test(salt)) return null;
  if (typeof hash !== "string" || !BASE64.test(hash)) return null;
  if (typeof iterations !== "number" || !Number.isInteger(iterations) || iterations < 1000 || iterations > 5_000_000) return null;
  const idle = (IDLE_OPTIONS as readonly unknown[]).includes(idleMinutes) ? (idleMinutes as IdleMinutes) : DEFAULT_IDLE_MINUTES;
  return { salt, hash, iterations, idleMinutes: idle };
}

export function loadLockConfig(store: KeyValueStore): LockConfig | null {
  try {
    return parseLockConfig(store.getItem(LOCK_KEY));
  } catch {
    return null;
  }
}

/** `false` if the browser would not keep it (storage full or blocked). */
export function saveLockConfig(store: KeyValueStore, config: LockConfig): boolean {
  try {
    store.setItem(LOCK_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

/** Removes the lock and the count of wrong guesses with it. */
export function clearLockConfig(store: KeyValueStore): void {
  try {
    store.removeItem(LOCK_KEY);
    store.removeItem(ATTEMPTS_KEY);
  } catch {
    /* nothing more can be done */
  }
}

// ─── Wrong guesses ──────────────────────────────────────────────────────────

export type Attempts = { failures: number; until: number };

export function parseAttempts(raw: string | null): Attempts {
  const none: Attempts = { failures: 0, until: 0 };
  if (!raw) return none;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const failures = typeof data.failures === "number" && Number.isInteger(data.failures) && data.failures >= 0 ? Math.min(data.failures, 1000) : 0;
    const until = typeof data.until === "number" && Number.isFinite(data.until) ? data.until : 0;
    return { failures, until };
  } catch {
    return none;
  }
}

/** Seconds to wait after this many wrong guesses in a row: none for the first
 *  few, then 30, 60, 120 and so on up to fifteen minutes. */
export function waitAfterFailures(failures: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  return Math.min(MAX_WAIT_SECONDS, BASE_WAIT_SECONDS * 2 ** (failures - FREE_ATTEMPTS));
}

/** Whole seconds still to wait, or 0. */
export function remainingWait(attempts: Attempts, now: number): number {
  return attempts.until > now ? Math.ceil((attempts.until - now) / 1000) : 0;
}

export function afterWrongPin(attempts: Attempts, now: number): Attempts {
  const failures = attempts.failures + 1;
  return { failures, until: now + waitAfterFailures(failures) * 1000 };
}

// ─── Idle ───────────────────────────────────────────────────────────────────

/** Whether the lock should close. No record of recent use (a new tab, a
 *  relaunched app) counts as having been away. */
export function shouldLock(input: { lastActive: number | null; now: number; idleMinutes: number }): boolean {
  if (input.lastActive === null) return true;
  return input.now - input.lastActive >= input.idleMinutes * 60_000;
}

export function readLastActive(store: KeyValueStore): number | null {
  try {
    const value = Number(store.getItem(ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeLastActive(store: KeyValueStore, now: number): void {
  try {
    store.setItem(ACTIVITY_KEY, String(now));
  } catch {
    /* without it the lock closes on the next check, which is the safe side */
  }
}

export function clearLastActive(store: KeyValueStore): void {
  try {
    store.removeItem(ACTIVITY_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Whether this browser can keep a lock at all: it needs somewhere to keep the
 *  setting and the secure-context crypto to hash the PIN. */
export function lockSupported(): boolean {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return false;
    const probe = "recoverly:lock:probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
