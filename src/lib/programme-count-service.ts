/**
 * What the server does with the monthly "someone counted used Recoverly" tick, with
 * no framework or database in the way so it can be tested: a small `CountStore`
 * goes in and an answer comes out. The route in `app/api/programme/count` is a thin
 * wrapper, and `programme-count-firestore.ts` is the real store.
 *
 * The store only ever adds to numbers and reads numbers back. There is no method that
 * takes a person, and none that lists anyone: that is the design (see `programme-count.ts`),
 * and `programme-count-service.test.ts` pins it, so a list of who was counted cannot be
 * added without that test, and this note, being changed on purpose.
 */
import { type Programme } from "@/lib/programme";
import { monthKey } from "@/lib/programme-count";
import { type OutcomeTotals, contribution } from "@/lib/programme-outcomes";
import { cleanFigures } from "@/lib/progress-figures";

/**
 * Every method adds to a number or reads numbers. None takes a person, and none lists
 * anyone; `programme-count-service.test.ts` pins that.
 */
export interface CountStore {
  /** Add one to this programme's total of people counted in `month` ("2026-11"). Nothing else. */
  increment(code: string, month: string): Promise<void>;
  /** The totals for one programme: month → people counted. */
  read(code: string): Promise<Record<string, number>>;
  /** Add one person's progress figures into the programme's running sums for `month`, the month the figures describe. */
  addFigures(code: string, month: string, add: OutcomeTotals): Promise<void>;
  /** The running sums for one programme: month → sums. */
  readFigures(code: string): Promise<Record<string, OutcomeTotals>>;
}

export type TickResult =
  | { ok: true; month: string; counted: boolean; figuresCounted: boolean }
  | { ok: false; status: number; error: string };

/**
 * Add one to the programme's total for this month.
 *
 * Only a programme that has agreed to receive the headcount (`headcount: true`) is
 * counted at all; a programme that has not answers "not found", as if it did not
 * exist, so a request cannot be used to tell which ones do. The sample programme
 * accepts the tick and stores nothing, so the choice can be tried out without
 * leaving anything behind.
 */
export async function recordTick(store: CountStore, programme: Programme | null, now: Date, figures?: unknown): Promise<TickResult> {
  if (!programme || !programme.headcount) return { ok: false, status: 404, error: "not-found" };
  const month = monthKey(now);
  if (programme.kind === "sample") return { ok: true, month, counted: false, figuresCounted: false };
  await store.increment(programme.code, month);

  // Progress figures ride along only where the organisation offers them and they are exactly
  // last month's, well-formed. Anything else is ignored: the person is still counted.
  let figuresCounted = false;
  const clean = programme.figures ? cleanFigures(figures, month) : null;
  if (clean) {
    await store.addFigures(programme.code, clean.month, contribution(clean));
    figuresCounted = true;
  }
  return { ok: true, month, counted: true, figuresCounted };
}
