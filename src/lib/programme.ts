/**
 * Organisation programmes: how an employer, college, clinic or NGO gives its
 * people a way into Recoverly with the organisation's name and support contacts
 * on it.
 *
 * A programme is a code. Entering it adds the organisation's name, a welcome and
 * its own support contacts to the person's dashboard, on that device only.
 * Nothing flows back: the organisation is not told who joined, how many joined,
 * or anything anyone logs. That is the promise `programme.private` makes in every
 * language, and it is why nothing here counts, lists or reports members, and why
 * no request about a programme carries an account. Do not add any of that
 * without changing that text and the privacy policy first (CLAUDE.md, firm rule 4).
 *
 * This file is safe for browsers: types, cleaning and checking. The register of
 * real programmes is in `programme-register.ts` and never reaches a browser.
 */
import { LOCALES, type Locale, isLocale } from "@/lib/i18n/types";

export const PROGRAMME_KINDS = ["workplace", "college", "clinic", "community", "sample"] as const;
export type ProgrammeKind = (typeof PROGRAMME_KINDS)[number];

export type ProgrammeContact = {
  /** What it is, in the organisation's words: "Employee assistance line". */
  label: string;
  /** A number to call. 3 to 15 digits, so a short code such as 14416 is allowed. */
  phone?: string;
  email?: string;
  /** https only. */
  url?: string;
  /** Free text such as "Mon to Sat, 9 am to 6 pm". Say 24 hours only if it is true. */
  hours?: string;
};

export type Programme = {
  /** Upper-case letters and digits, 6 to 16. Typed from a poster, so no look-alike tricks. */
  code: string;
  name: string;
  kind: ProgrammeKind;
  /** The organisation's own words to its people, English required, other languages optional. */
  welcome: Partial<Record<Locale, string>> & { en: string };
  contacts: ProgrammeContact[];
  /** The language a first-time visitor sees, when they have not chosen one. */
  locale?: Locale;
};

export const PROGRAMME_LIMITS = {
  codeMin: 4,
  codeMax: 16,
  /** A real programme's code. Four to five characters are guessable; the sample is the one exception. */
  registeredCodeMin: 6,
  nameMax: 80,
  welcomeMin: 10,
  welcomeMax: 400,
  labelMax: 80,
  hoursMax: 80,
  emailMax: 120,
  urlMax: 200,
  contactsMax: 4,
  phoneDigitsMin: 3,
  phoneDigitsMax: 15
} as const;

const CODE_PATTERN = /^[A-Z0-9]+$/;

/** What a person typed or scanned, as the code it stands for. `null` if it cannot be one. */
export function normaliseCode(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 40) return null;
  const code = input.toUpperCase().replace(/[\s\-_.]/g, "");
  if (code.length < PROGRAMME_LIMITS.codeMin || code.length > PROGRAMME_LIMITS.codeMax) return null;
  return CODE_PATTERN.test(code) ? code : null;
}

/** Collapse whitespace, drop control characters, cut to length. Empty when not text. */
function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Digits, and a leading + for a country code. `null` if it cannot be dialled. */
export function cleanContactPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^\+?[\d\s\-().]+$/.test(text)) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length < PROGRAMME_LIMITS.phoneDigitsMin || digits.length > PROGRAMME_LIMITS.phoneDigitsMax) return null;
  return (text.startsWith("+") ? "+" : "") + digits;
}

function cleanEmail(value: unknown): string | null {
  const text = cleanText(value, PROGRAMME_LIMITS.emailMax);
  return /^[^\s@<>"'`]+@[^\s@<>"'`]+\.[^\s@<>"'`]+$/.test(text) ? text : null;
}

/** An https address with no embedded login, or `null`. Never `javascript:`, `http:` or `data:`. */
export function cleanHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > PROGRAMME_LIMITS.urlMax) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
  return url.toString();
}

function cleanContact(input: unknown): ProgrammeContact | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;
  const label = cleanText(raw.label, PROGRAMME_LIMITS.labelMax);
  if (!label) return null;
  const contact: ProgrammeContact = { label };
  const phone = cleanContactPhone(raw.phone);
  const email = cleanEmail(raw.email);
  const url = cleanHttpsUrl(raw.url);
  const hours = cleanText(raw.hours, PROGRAMME_LIMITS.hoursMax);
  if (phone) contact.phone = phone;
  if (email) contact.email = email;
  if (url) contact.url = url;
  if (hours) contact.hours = hours;
  // A contact with no way to reach it is not a contact.
  return contact.phone || contact.email || contact.url ? contact : null;
}

/**
 * Rebuild a programme from anything: a network response or whatever is in
 * localStorage, which a person (or a bug) may have edited. Only known fields
 * survive, text is cleaned and links are limited to what a phone or browser can
 * safely open, so a stored value can never become a script. `null` when it is
 * not a usable programme.
 */
export function sanitiseProgramme(input: unknown): Programme | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;

  const code = normaliseCode(raw.code);
  const name = cleanText(raw.name, PROGRAMME_LIMITS.nameMax);
  if (!code || !name) return null;
  const kind = (PROGRAMME_KINDS as readonly unknown[]).includes(raw.kind) ? (raw.kind as ProgrammeKind) : null;
  if (!kind) return null;

  const welcomeIn = typeof raw.welcome === "object" && raw.welcome !== null ? (raw.welcome as Record<string, unknown>) : {};
  const welcome: Partial<Record<Locale, string>> = {};
  for (const locale of LOCALES) {
    const text = cleanText(welcomeIn[locale], PROGRAMME_LIMITS.welcomeMax);
    if (text) welcome[locale] = text;
  }
  if (!welcome.en) return null;

  const contacts = (Array.isArray(raw.contacts) ? raw.contacts : [])
    .map(cleanContact)
    .filter((c): c is ProgrammeContact => c !== null)
    .slice(0, PROGRAMME_LIMITS.contactsMax);

  const programme: Programme = { code, name, kind, welcome: welcome as Programme["welcome"], contacts };
  if (isLocale(raw.locale)) programme.locale = raw.locale;
  return programme;
}

/** The organisation's welcome in this language, or in English where it wrote none. */
export function welcomeFor(programme: Programme, locale: Locale): string {
  return programme.welcome[locale] ?? programme.welcome.en;
}

export function isSample(programme: Programme): boolean {
  return programme.kind === "sample";
}

/**
 * Problems with a programme someone is about to add to the register, as plain
 * sentences. The tests run this over every entry, so a typo in a new
 * organisation's number or link fails the build instead of reaching its people.
 */
export function validateProgramme(programme: Programme): string[] {
  const problems: string[] = [];
  const at = (message: string) => `${programme.code || "(no code)"}: ${message}`;
  const L = PROGRAMME_LIMITS;

  if (normaliseCode(programme.code) !== programme.code) problems.push(at("the code must be upper-case letters and digits, 4 to 16 long, with no spaces or hyphens"));
  if (programme.code.length < L.registeredCodeMin && programme.kind !== "sample") problems.push(at(`a real programme's code is at least ${L.registeredCodeMin} characters`));
  if (!(PROGRAMME_KINDS as readonly string[]).includes(programme.kind)) problems.push(at("unknown kind"));
  if (programme.kind === "sample" && programme.code !== "SAMPLE") problems.push(at("only the SAMPLE code may be of kind sample"));
  if (programme.kind !== "sample" && programme.code === "SAMPLE") problems.push(at("SAMPLE is reserved for the sample programme"));

  if (cleanText(programme.name, L.nameMax) !== programme.name || programme.name.length < 2) problems.push(at(`name must be 2 to ${L.nameMax} characters on one line`));

  if (!programme.welcome?.en) problems.push(at("an English welcome is required"));
  for (const [locale, text] of Object.entries(programme.welcome ?? {})) {
    if (!isLocale(locale)) problems.push(at(`welcome language "${locale}" is not one we support`));
    else if (typeof text !== "string" || text !== cleanText(text, L.welcomeMax)) problems.push(at(`welcome (${locale}) must be plain text of at most ${L.welcomeMax} characters`));
    else if (locale === "en" && text.length < L.welcomeMin) problems.push(at(`welcome (en) is too short`));
  }

  if (programme.locale !== undefined && !isLocale(programme.locale)) problems.push(at("locale is not one we support"));

  if (programme.contacts.length > L.contactsMax) problems.push(at(`at most ${L.contactsMax} contacts`));
  programme.contacts.forEach((contact, i) => {
    const where = `contact ${i + 1}`;
    if (!contact.label || cleanText(contact.label, L.labelMax) !== contact.label) problems.push(at(`${where} needs a label of at most ${L.labelMax} characters`));
    if (!contact.phone && !contact.email && !contact.url) problems.push(at(`${where} has no phone, email or link`));
    if (contact.phone !== undefined && cleanContactPhone(contact.phone) !== contact.phone) problems.push(at(`${where}: phone must be digits (and a leading +), 3 to 15 of them, with no spaces`));
    if (contact.email !== undefined && cleanEmail(contact.email) !== contact.email) problems.push(at(`${where}: that is not an email address`));
    if (contact.url !== undefined && cleanHttpsUrl(contact.url) !== contact.url) problems.push(at(`${where}: link must be a complete https address, written the way a browser would (for example with a trailing slash after a bare domain)`));
    if (contact.hours !== undefined && cleanText(contact.hours, L.hoursMax) !== contact.hours) problems.push(at(`${where}: hours must be plain text of at most ${L.hoursMax} characters`));
  });

  return problems;
}
