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
 *
 * TO OFFER MORE (each needs `report` above, and each is still the person's own unticked choice)
 *   - `figures: true`   anonymous progress-figure averages (lib/progress-figures.ts), shown on the
 *                       same report page, only for groups of 20 or more.
 *   - `workspace: {}`   a private team workspace (lib/workspace.ts) where people who choose to can
 *                       share their own progress with the team by name, encrypted so only the team
 *                       can read it. This hands an organisation individual-level data, by each
 *                       person's explicit act. Read CLAUDE.md "Summary links, the headcount and the
 *                       team workspace" first. It can only be switched on for a `clinic` or
 *                       `community` programme: for a workplace or a college a person cannot freely
 *                       say no to their own employer or institution, so the code refuses
 *                       (`workspaceAllowedFor`), whatever is written here. Steps:
 *                         1. Add `workspace: {}` to the entry, with its `report` line. Push.
 *                         2. Send the team its private report link. Its workspace page
 *                            (/partners/workspace/<key>) then walks the team through making its key
 *                            in its own browser, locked by a passphrase only it knows, and gives it
 *                            one block of text to send back: its PUBLIC key. Nobody, including us,
 *                            can recover the passphrase; the page says so.
 *                         3. Paste that block as `workspace: { publicKey: { ... } }` (the tests
 *                            refuse anything that contains a private part), push, and read the key's
 *                            fingerprint back to the team so they can check it is theirs.
 *                         4. From the deploy, people in that programme are offered the workspace.
 *                       Never accept a public key from anything but the team's own page or message.
 */
import { createHash, timingSafeEqual } from "node:crypto";

import { type Programme, normaliseCode } from "@/lib/programme";
import { WORKSPACE_LIMITS, type WorkspaceTeam, cleanPublicKey, publicKeyText, workspaceAllowedFor } from "@/lib/workspace";

/** An organisation in the register: what its people see, plus (server-side only) how it reads its headcount. */
export type RegisterEntry = Omit<Programme, "headcount" | "figures" | "workspace"> & {
  /** Present when the organisation receives the anonymous monthly headcount: the SHA-256 (hex) of its private report key. */
  report?: { keyHash: string };
  /** Also receives anonymous progress-figure averages (needs `report`). */
  figures?: true;
  /**
   * Has a private team workspace where people can share their progress by name. Needs `report`
   * (which also guards the team's page) and a kind that is not a workplace or a college
   * (`workspaceAllowedFor`). `publicKey` is the team's public key, added once the team has
   * made it on its own page and sent it to us; people are offered the workspace only from then.
   */
  workspace?: { publicKey?: JsonWebKey };
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
  const { report, figures, workspace, ...rest } = entry;
  const programme: Programme = { ...rest };
  const demo = entry.kind === "sample";
  if (report || demo) programme.headcount = true;
  if ((report && figures) || demo) programme.figures = true;
  if (demo || workspaceKeyFor(entry)) programme.workspace = true;
  return programme;
}

/** The team's public key for an entry, only if the workspace may be on for it at all and the key is a good one. */
export function workspaceKeyFor(entry: RegisterEntry): JsonWebKey | null {
  if (!entry.report || !entry.workspace || !workspaceAllowedFor(entry.kind)) return null;
  return cleanPublicKey(entry.workspace.publicKey);
}

/** A key's fingerprint, the same text the browser's `keyIdOf` makes. */
export function workspaceKeyId(key: JsonWebKey): string {
  return createHash("sha256").update(publicKeyText(key)).digest("hex").slice(0, WORKSPACE_LIMITS.keyIdChars);
}

/**
 * The workspace of a register entry, or `null` if it has none or may not have one. The sample
 * programme is a practice workspace (no key, stores nothing). A real one needs a report key, a
 * `workspace` entry and a kind that is not a workplace or a college; its key is `null` until the
 * team's public key has been added.
 */
export function workspaceTeamFor(entry: RegisterEntry): WorkspaceTeam | null {
  if (entry.kind === "sample") return { code: entry.code, name: entry.name, practice: true, publicKey: null, keyId: null };
  if (!entry.report || !entry.workspace || !workspaceAllowedFor(entry.kind)) return null;
  const publicKey = workspaceKeyFor(entry);
  return { code: entry.code, name: entry.name, practice: false, publicKey, keyId: publicKey ? workspaceKeyId(publicKey) : null };
}

/** The workspace a person can share with, for a programme code: the sample (practice), or one whose key is in the register. Otherwise `null`. */
export function findWorkspaceTeam(input: unknown): WorkspaceTeam | null {
  const code = normaliseCode(input);
  const entry = code ? PROGRAMMES.find((programme) => programme.code === code) : undefined;
  const team = entry ? workspaceTeamFor(entry) : null;
  return team && (team.practice || team.publicKey) ? team : null;
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

/**
 * The workspace behind a team's private link, or `null` if the link is not one or the organisation
 * has no workspace (or may not have one). Unlike `findWorkspaceTeam` this also answers while the
 * team has not yet sent its key, so the team's page can walk it through making one.
 */
export function findWorkspaceByReportKey(token: unknown): WorkspaceTeam | null {
  const entry = findProgrammeByReportKey(token);
  const team = entry ? workspaceTeamFor(entry) : null;
  return team && !team.practice ? team : null;
}
