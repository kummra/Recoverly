/**
 * "Someone I can call": one person the user trusts, saved on this device.
 *
 * Reaching a real person in a hard moment beats anything the app can say, but
 * the "text someone you trust" button used to open a blank message and leave the
 * person to find a contact while a craving was at its peak. With one person
 * saved, the craving screen offers to call or text them in one tap.
 *
 * Like plans, this is about the people in someone's life and about their
 * drinking, so it never leaves the device: not on the server, not in the export,
 * not in a prompt. The buttons only open the phone's own call and messages apps;
 * Recoverly never sends anything to this person. Everything here is defensive
 * about storage (absent, full, blocked, hand-edited) and none of that may break
 * the craving screen.
 */

export type SupportPerson = { name: string; phone: string };

export const MAX_PERSON_NAME = 40;
export const MIN_PHONE_DIGITS = 7;
export const MAX_PHONE_DIGITS = 15;

export function personStorageKey(userId: string): string {
  return `recoverly:person:${userId}`;
}

/** Collapse whitespace and cut to length. */
export function cleanPersonName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_PERSON_NAME);
}

/**
 * What a phone can dial: digits, and a leading + for a country code. People
 * type spaces, hyphens, brackets and dots, which are fine; letters are not.
 * `null` when it cannot be a phone number (too few or too many digits).
 */
export function normalisePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (!/^\+?[\d\s\-().]+$/.test(text)) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) return null;
  return (text.startsWith("+") ? "+" : "") + digits;
}

export type PersonProblem = "name" | "phone";

/** A usable person, or what is wrong with the input. */
export function validatePerson(input: { name: unknown; phone: unknown }): { ok: true; person: SupportPerson } | { ok: false; problem: PersonProblem } {
  const name = cleanPersonName(input.name);
  if (!name) return { ok: false, problem: "name" };
  const phone = normalisePhone(input.phone);
  if (!phone) return { ok: false, problem: "phone" };
  return { ok: true, person: { name, phone } };
}

/** What is in storage, if it is a well-formed person. Anything else is `null`. */
export function parsePerson(raw: string | null): SupportPerson | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const result = validatePerson(data as { name: unknown; phone: unknown });
  return result.ok ? result.person : null;
}

export function loadPerson(userId: string): SupportPerson | null {
  try {
    return parsePerson(window.localStorage.getItem(personStorageKey(userId)));
  } catch {
    return null;
  }
}

/** False when the browser refused to store it, so the caller can say so. */
export function savePerson(userId: string, person: SupportPerson): boolean {
  try {
    window.localStorage.setItem(personStorageKey(userId), JSON.stringify(person));
    return true;
  } catch {
    return false;
  }
}

/** Forget the saved person. Called on account deletion, because a device-only
 *  value is out of the server's reach: "delete my data" must include it. Never throws. */
export function clearPerson(userId: string): void {
  try {
    window.localStorage.removeItem(personStorageKey(userId));
  } catch {
    /* nothing stored, or storage unavailable: nothing to remove */
  }
}

/** Opens the phone's dialler. */
export function telHref(person: SupportPerson): string {
  return `tel:${person.phone}`;
}

/** Opens the phone's messages with the number filled in. `?&body=` is the form
 *  both Android and iPhone accept. */
export function smsHref(person: SupportPerson, body: string): string {
  return `sms:${person.phone}?&body=${encodeURIComponent(body)}`;
}
