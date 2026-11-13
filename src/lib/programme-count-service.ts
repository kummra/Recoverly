/**
 * What the server does with the monthly "someone counted used Recoverly" tick, with
 * no framework or database in the way so it can be tested: a small `CountStore`
 * goes in and an answer comes out. The route in `app/api/programme/count` is a thin
 * wrapper, and `programme-count-firestore.ts` is the real store.
 *
 * The store only ever adds one to a number. There is no method that takes a person,
 * and none that lists anyone: that is the design (see `programme-count.ts`), and
 * `programme-count-service.test.ts` pins it, so a list of who was counted cannot be
 * added without that test, and this note, being changed on purpose.
 */
import { type Programme } from "@/lib/programme";
import { monthKey } from "@/lib/programme-count";

export interface CountStore {
  /** Add one to this programme's total of people counted in `month` ("2026-11"). Nothing else. */
  increment(code: string, month: string): Promise<void>;
  /** The totals for one programme: month → people counted. */
  read(code: string): Promise<Record<string, number>>;
}

export type TickResult = { ok: true; month: string; counted: boolean } | { ok: false; status: number; error: string };

/**
 * Add one to the programme's total for this month.
 *
 * Only a programme that has agreed to receive the headcount (`headcount: true`) is
 * counted at all; a programme that has not answers "not found", as if it did not
 * exist, so a request cannot be used to tell which ones do. The sample programme
 * accepts the tick and stores nothing, so the choice can be tried out without
 * leaving anything behind.
 */
export async function recordTick(store: CountStore, programme: Programme | null, now: Date): Promise<TickResult> {
  if (!programme || !programme.headcount) return { ok: false, status: 404, error: "not-found" };
  const month = monthKey(now);
  if (programme.kind === "sample") return { ok: true, month, counted: false };
  await store.increment(programme.code, month);
  return { ok: true, month, counted: true };
}
