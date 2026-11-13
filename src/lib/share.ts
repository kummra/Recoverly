/**
 * Summary links: a person's own, read-only summary that they choose to hand to
 * someone they trust (a clinician, a counsellor, a family member).
 *
 * This is one of the two ways data can leave a person's account, and the only
 * ways (CLAUDE.md, firm rule 4, and `privacy.s13*`): the person starts it, sees
 * what goes in, can end it at any time, and it ends by itself. What makes that
 * safe is the design, not a promise:
 *
 *  - The summary is **encrypted on the person's own device** (`share-crypto.ts`)
 *    before anything is sent. The server stores only the scrambled copy. The key
 *    is in the part of the link after `#`, which browsers never send to any
 *    server, so Recoverly cannot read what it stores, and nor can anything that
 *    only fetches the address (a link preview, a mail scanner, a proxy).
 *  - Nothing is in it unless the person ticked it. Their email and account are
 *    never part of it: the optional name is whatever they typed.
 *  - It stops working after 1, 7 or 30 days (their choice) or when they stop it,
 *    and the stored copy is deleted then, and with their account.
 *
 * This file is plain and safe for browsers and the server: the shape of a
 * summary, cleaning it, building it from what the report page has worked out,
 * and reading a link. Whatever is decrypted is passed through `sanitiseSnapshot`
 * before it is shown, because a link can be made by anyone: the viewer must not
 * trust what it opens.
 */

/** How long a link works: 1, 7 or 30 days. The policy text states these; a test ties them together. */
export const SHARE_EXPIRY_HOURS = [24, 168, 720] as const;
export type ShareExpiryHours = (typeof SHARE_EXPIRY_HOURS)[number];
export const DEFAULT_EXPIRY_HOURS: ShareExpiryHours = 168;

export const SHARE_LIMITS = {
  /** Links a person can have at once. The policy states this too. */
  activeMax: 5,
  /** Base64url characters of ciphertext we will store. A real summary is a few kilobytes. */
  ciphertextMaxChars: 24_000,
  /** The shortest valid ciphertext: just the 16-byte authentication tag. */
  ciphertextMinChars: 22,
  labelMax: 40,
  noteMax: 1000,
  whyMax: 200,
  plansMax: 3,
  planTextMax: 120,
  patternsMax: 3,
  moodMax: 40
} as const;

/** What can be put in a summary. Each is off until the person ticks it. */
export const SHARE_SECTIONS = ["progress", "audit", "cravings", "patterns", "why", "notes", "plans"] as const;
export type ShareSection = (typeof SHARE_SECTIONS)[number];

/** Starting points for the tick-boxes. The words, notes and plans are never in one: those are the person's own. */
export const SHARE_PRESETS: Record<"clinician" | "supporter", readonly ShareSection[]> = {
  clinician: ["progress", "audit", "cravings", "patterns"],
  supporter: ["progress"]
};

export type ShareProgress = {
  /** yyyy-MM-dd of the first record, or null. */
  since: string | null;
  checkIns: number;
  monthMl: number;
  previousMonthMl: number;
  dailyAverageMl: number;
  currentStreakDays: number;
  longestStreakDays: number;
  freeDaysThisMonth: number;
  daysThisMonth: number;
  weeklyGoalMl: number | null;
};
export type ShareAudit = { score: number; max: number; date: string; assessments: number };
export type ShareCravings = { total: number; passed: number; avgIntensity: number };
export type SharePattern = { key: string; mood?: string; percent: number };
export type SharePlan = { when: string; then: string };

export type ShareSnapshot = {
  v: 1;
  /** When the person made it (ISO 8601). */
  createdAt: string;
  /** What the person typed to be called by, if anything. Never taken from the account. */
  label?: string;
  progress?: ShareProgress;
  audit?: ShareAudit;
  cravings?: ShareCravings;
  patterns?: SharePattern[];
  why?: string;
  note?: string;
  plans?: SharePlan[];
};

/** The only pattern labels a summary may carry: the app's own, so a stranger's link cannot make the page say anything. */
export const PATTERN_KEYS = [
  "trigger.sundays",
  "trigger.mondays",
  "trigger.tuesdays",
  "trigger.wednesdays",
  "trigger.thursdays",
  "trigger.fridays",
  "trigger.saturdays",
  "trigger.lateNights",
  "trigger.mornings",
  "trigger.afternoons",
  "trigger.evenings",
  "trigger.mood"
] as const;

// ─── Cleaning ─────────────────────────────────────────────────────────────

/** Text on one line: control characters gone, whitespace collapsed, cut to length. */
function line(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Text that may run over several lines (the person's own note). Newlines kept, other control characters gone. */
function paragraph(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return (
    value
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/g, " ")
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, max)
  );
}

function int(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(max, Math.max(min, n));
}

function decimal(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;
}

/** A calendar day as yyyy-MM-dd, or null. */
function day(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
}

function isoTime(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * Rebuild a summary from anything: what the viewer just decrypted, or what the
 * builder produced. Only known fields survive, numbers are clamped to what they
 * can honestly be, text is cleaned and cut, and pattern labels must be the app's
 * own. `null` when it is not a version-1 summary with a valid time. Never throws.
 */
export function sanitiseSnapshot(input: unknown): ShareSnapshot | null {
  const raw = record(input);
  if (!raw || raw.v !== 1) return null;
  const createdAt = isoTime(raw.createdAt);
  if (!createdAt) return null;

  const out: ShareSnapshot = { v: 1, createdAt };

  const label = line(raw.label, SHARE_LIMITS.labelMax);
  if (label) out.label = label;

  const progress = record(raw.progress);
  if (progress) {
    out.progress = {
      since: day(progress.since),
      checkIns: int(progress.checkIns, 0, 1_000_000),
      monthMl: int(progress.monthMl, 0, 10_000_000),
      previousMonthMl: int(progress.previousMonthMl, 0, 10_000_000),
      dailyAverageMl: int(progress.dailyAverageMl, 0, 100_000),
      currentStreakDays: int(progress.currentStreakDays, 0, 100_000),
      longestStreakDays: int(progress.longestStreakDays, 0, 100_000),
      freeDaysThisMonth: int(progress.freeDaysThisMonth, 0, 31),
      daysThisMonth: int(progress.daysThisMonth, 0, 31),
      weeklyGoalMl: progress.weeklyGoalMl === null || progress.weeklyGoalMl === undefined ? null : int(progress.weeklyGoalMl, 0, 100_000)
    };
  }

  const audit = record(raw.audit);
  const auditDate = audit ? day(audit.date) : null;
  if (audit && auditDate) {
    out.audit = { score: int(audit.score, 0, 40), max: 40, date: auditDate, assessments: int(audit.assessments, 1, 10_000) };
  }

  const cravings = record(raw.cravings);
  if (cravings) {
    const total = int(cravings.total, 0, 1_000_000);
    out.cravings = { total, passed: int(cravings.passed, 0, total), avgIntensity: decimal(cravings.avgIntensity, 0, 5) };
  }

  if (Array.isArray(raw.patterns)) {
    const patterns: SharePattern[] = [];
    for (const item of raw.patterns) {
      const entry = record(item);
      if (!entry || !(PATTERN_KEYS as readonly unknown[]).includes(entry.key)) continue;
      const pattern: SharePattern = { key: entry.key as string, percent: int(entry.percent, 0, 100) };
      if (entry.key === "trigger.mood") {
        const mood = line(entry.mood, SHARE_LIMITS.moodMax);
        if (!mood) continue;
        pattern.mood = mood;
      }
      patterns.push(pattern);
      if (patterns.length >= SHARE_LIMITS.patternsMax) break;
    }
    if (patterns.length) out.patterns = patterns;
  }

  const why = line(raw.why, SHARE_LIMITS.whyMax);
  if (why) out.why = why;

  const note = paragraph(raw.note, SHARE_LIMITS.noteMax);
  if (note) out.note = note;

  if (Array.isArray(raw.plans)) {
    const plans: SharePlan[] = [];
    for (const item of raw.plans) {
      const entry = record(item);
      if (!entry) continue;
      const when = line(entry.when, SHARE_LIMITS.planTextMax);
      const then = line(entry.then, SHARE_LIMITS.planTextMax);
      if (!when || !then) continue;
      plans.push({ when, then });
      if (plans.length >= SHARE_LIMITS.plansMax) break;
    }
    if (plans.length) out.plans = plans;
  }

  return out;
}

/** Does this summary carry anything a reader could see? (A link with nothing in it is a mistake.) */
export function hasContent(snapshot: ShareSnapshot): boolean {
  return Boolean(snapshot.progress || snapshot.audit || snapshot.cravings || snapshot.patterns || snapshot.why || snapshot.note || snapshot.plans);
}

// ─── Building ─────────────────────────────────────────────────────────────

/** Everything the report page has worked out, as plain values. The builder takes only what is ticked. */
export type ShareFacts = {
  recordsSince: Date | null;
  totalLogged: number;
  monthMl: number;
  previousMonthMl: number;
  dailyAverageMl: number;
  currentStreakDays: number;
  longestStreakDays: number;
  freeDaysThisMonth: number;
  daysThisMonth: number;
  weeklyGoalMl: number | null;
  audit: { score: number; date: Date; assessments: number } | null;
  cravings: { total: number; passed: number; avgIntensity: number } | null;
  patterns: Array<{ labelKey: string; mood?: string; share: number }>;
  motivation: string | null;
  note: string;
  plans: SharePlan[];
};

/** A local calendar day as yyyy-MM-dd (the day the person saw it as). */
function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The summary to encrypt: only the ticked sections, then cleaned by the same
 * function the viewer uses, so what is made and what is shown cannot drift.
 * The account is never an input: there is no email or display name here to leak.
 */
export function buildSnapshot(facts: ShareFacts, sections: readonly ShareSection[], options: { label?: string; now?: Date } = {}): ShareSnapshot {
  const picked = new Set(sections);
  const draft: Record<string, unknown> = { v: 1, createdAt: (options.now ?? new Date()).toISOString() };
  if (options.label) draft.label = options.label;

  if (picked.has("progress")) {
    draft.progress = {
      since: facts.recordsSince ? isoDay(facts.recordsSince) : null,
      checkIns: facts.totalLogged,
      monthMl: facts.monthMl,
      previousMonthMl: facts.previousMonthMl,
      dailyAverageMl: facts.dailyAverageMl,
      currentStreakDays: facts.currentStreakDays,
      longestStreakDays: facts.longestStreakDays,
      freeDaysThisMonth: facts.freeDaysThisMonth,
      daysThisMonth: facts.daysThisMonth,
      weeklyGoalMl: facts.weeklyGoalMl
    };
  }
  if (picked.has("audit") && facts.audit) {
    draft.audit = { score: facts.audit.score, date: isoDay(facts.audit.date), assessments: facts.audit.assessments };
  }
  if (picked.has("cravings") && facts.cravings) draft.cravings = facts.cravings;
  if (picked.has("patterns") && facts.patterns.length) {
    draft.patterns = facts.patterns.map((p) => ({ key: p.labelKey, mood: p.mood, percent: Math.round(p.share * 100) }));
  }
  if (picked.has("why") && facts.motivation) draft.why = facts.motivation;
  if (picked.has("notes") && facts.note.trim()) draft.note = facts.note;
  if (picked.has("plans") && facts.plans.length) draft.plans = facts.plans;

  // The draft is built from known shapes, so this cannot be null.
  return sanitiseSnapshot(draft) as ShareSnapshot;
}

// ─── Encoding and links ───────────────────────────────────────────────────

/** Bytes as URL-safe base64 with no padding. */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The bytes behind URL-safe base64, or `null` if it is not that. */
export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** The address of a stored summary: 16 random bytes, 22 characters. Not secret on its own (the key is). */
const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
/** The key: 32 random bytes, 43 characters. */
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
/** The initialisation vector: 12 random bytes, 16 characters. */
const IV_PATTERN = /^[A-Za-z0-9_-]{16}$/;

export function isShareId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}
export function isShareIv(value: unknown): value is string {
  return typeof value === "string" && IV_PATTERN.test(value);
}
export function isShareCiphertext(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= SHARE_LIMITS.ciphertextMinChars &&
    value.length <= SHARE_LIMITS.ciphertextMaxChars &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

export function isExpiryHours(value: unknown): value is ShareExpiryHours {
  return (SHARE_EXPIRY_HOURS as readonly unknown[]).includes(value);
}

/** The link to hand over. The key follows `#`, so it is never sent to a server. */
export function buildShareLink(origin: string, id: string, key: string): string {
  return `${origin.replace(/\/+$/, "")}/share/${id}#${key}`;
}

/**
 * The key from a link's fragment (`location.hash`), or `null`. Lenient about
 * what a chat app or an email may have stuck on the end (a full stop, a
 * bracket), strict about the key itself.
 */
export function parseShareKey(hash: string | null | undefined): string | null {
  if (typeof hash !== "string") return null;
  const candidate = hash.replace(/^#/, "").slice(0, 43);
  return KEY_PATTERN.test(candidate) ? candidate : null;
}

/** The id from the address segment, or `null`. It may arrive percent-encoded. */
export function parseShareId(segment: string | null | undefined): string | null {
  if (typeof segment !== "string") return null;
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  return isShareId(decoded) ? decoded : null;
}
