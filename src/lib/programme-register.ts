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
 *      are not told who joins, or how many. See the note in `lib/programme.ts`.
 */
import { type Programme, normaliseCode } from "@/lib/programme";

export const PROGRAMMES: readonly Programme[] = [
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

/** The programme for a code a person typed or scanned, or `null`. */
export function findProgramme(input: unknown): Programme | null {
  const code = normaliseCode(input);
  if (!code) return null;
  return PROGRAMMES.find((programme) => programme.code === code) ?? null;
}
