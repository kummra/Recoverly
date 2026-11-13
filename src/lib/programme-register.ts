/**
 * The register of organisation programmes. SERVER ONLY: the route in
 * `app/api/programme` answers one code at a time, so a browser only ever learns
 * about a programme it was given the code for. `programme.test.ts` fails if any
 * client component imports this file.
 *
 * It is code and not a database on purpose: a new organisation is a reviewed
 * change, and `validateProgramme` (run over every entry by the tests) refuses a
 * badly formed number or link before it can reach the organisation's people.
 *
 * TO ADD AN ORGANISATION
 *   1. Agree with them what is printed here: their name, a welcome in their own
 *      words, and the support contacts they are willing to be named for. Anything
 *      here is shown to everyone who has the code, so nothing private.
 *   2. Add an entry below. Pick a code of 6 to 16 letters and digits that is not a
 *      word anyone would guess (a name and a year: "ACMELOGI26").
 *   3. Run `npm test`, then push to main. It is live after the deploy.
 *   4. Tell them honestly what they get: a code, a join link and a poster. They
 *      are not told who joins. See the note in `lib/programme.ts`.
 *
 * TO GIVE AN ORGANISATION THE ANONYMOUS MONTHLY HEADCOUNT (only if it asks, and
 * only once you have read `lib/programme-count.ts`: it is the one number they can
 * receive, and their people may decline to be in it)
 *   1. Run `node scripts/make-report-key.mjs`. It prints a private report link for
 *      the organisation and the `report: { keyHash: "..." }` line for its entry.
 *      The link itself is never written down in this repository, only the hash.
 *   2. Add that `report` line to the organisation's entry below, and push.
 *   3. Send the organisation the link (it is a secret: whoever has it can read their
 *      monthly figures, nothing else). Their people are then shown the unticked
 *      "count me" choice; nobody else is counted. The figures appear on that page
 *      only once at least 20 people are counted.
 */
import { createHash, timingSafeEqual } from "node:crypto";

import { type Programme, normaliseCode } from "@/lib/programme";

/** An organisation in the register: what its people see, plus (server-side only) how it reads its headcount. */
export type RegisterEntry = Omit<Programme, "headcount"> & {
  /** Present when the organisation receives the anonymous monthly headcount: the SHA-256 (hex) of its private report key. */
  report?: { keyHash: string };
};

export const PROGRAMMES: readonly RegisterEntry[] = [
  {
    // Lets anyone see how a programme looks without an organisation behind it.
    // Its only contact is the national helpline the app already shows everywhere.
    code: "SAMPLE",
    name: "Sample organisation",
    kind: "sample",
    welcome: {
      en: "Welcome. This is how a message from an organisation to its people would look. A real organisation writes its own."
    },
    contacts: [{ label: "Tele-MANAS, the national mental-health helpline", phone: "14416", hours: "24 hours, every day" }]
  }
];

/**
 * What a person is shown about a register entry. The report key's hash never leaves
 * the server; a browser only learns whether the headcount choice is on offer. The
 * sample programme offers it (so it can be tried) but stores nothing
 * (`recordTick` in `programme-count-service.ts`).
 */
export function publicProgramme(entry: RegisterEntry): Programme {
  const { report, ...rest } = entry;
  const programme: Programme = { ...rest };
  if (report || entry.kind === "sample") programme.headcount = true;
  return programme;
}

/** The programme for a code a person typed or scanned, or `null`. */
export function findProgramme(input: unknown): Programme | null {
  const code = normaliseCode(input);
  if (!code) return null;
  const entry = PROGRAMMES.find((programme) => programme.code === code);
  return entry ? publicProgramme(entry) : null;
}

/** The SHA-256 of a report key, as hex. Keys are random and long, so a plain hash is enough to keep them out of the repository. */
export function hashReportKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Which of `entries` a private report key belongs to, or `null`. Compares hashes in
 * constant time and looks at every entry, so how long it takes says nothing about
 * which key was close. (Takes the entries so it can be tested with made-up ones.)
 */
export function matchReportKey(entries: readonly RegisterEntry[], token: unknown): RegisterEntry | null {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  const given = createHash("sha256").update(token).digest();
  let found: RegisterEntry | null = null;
  for (const entry of entries) {
    if (!entry.report || !/^[0-9a-f]{64}$/.test(entry.report.keyHash)) continue;
    if (timingSafeEqual(given, Buffer.from(entry.report.keyHash, "hex"))) found = entry;
  }
  return found;
}

/** The organisation a private report link belongs to, or `null`. */
export function findProgrammeByReportKey(token: unknown): RegisterEntry | null {
  return matchReportKey(PROGRAMMES, token);
}
