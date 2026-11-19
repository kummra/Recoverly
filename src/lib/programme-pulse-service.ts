/**
 * Recording one anonymous answer to the monthly question. Plain functions over a small store, like `programme-count-service.ts`,
 * so the rules can be tested without a framework or a database. The store only ever adds one to a number and reads numbers back:
 * there is no method that takes a person, and none that lists anyone. `programme-pulse.test.ts` pins that.
 */
import type { Programme } from "@/lib/programme";
import { monthKey } from "@/lib/programme-count";
import { type PulseAnswer, type PulseCounts, isPulseAnswer } from "@/lib/programme-pulse";

export interface PulseStore {
  /** Add one to the count of people who gave `answer` in `month` ("2026-11"). Nothing else. */
  add(code: string, month: string, answer: PulseAnswer): Promise<void>;
  /** The counts for one programme: month → how many gave each answer. */
  read(code: string): Promise<Record<string, PulseCounts>>;
}

export type PulseResult = { ok: true; month: string; recorded: boolean } | { ok: false; status: number; error: string };

/**
 * Add one answer to the programme's counts for this month. Only a programme that offers the headcount and the survey takes an
 * answer; any other answers "not found", as if it did not exist, so a request cannot be used to tell which ones do. The sample
 * programme accepts the answer and stores nothing, so the choice can be tried without leaving anything behind.
 */
export async function recordPulse(store: PulseStore, programme: Programme | null, now: Date, answer: unknown): Promise<PulseResult> {
  if (!programme || !programme.headcount || !programme.pulse) return { ok: false, status: 404, error: "not-found" };
  if (!isPulseAnswer(answer)) return { ok: false, status: 400, error: "invalid" };
  const month = monthKey(now);
  if (programme.kind === "sample") return { ok: true, month, recorded: false };
  await store.add(programme.code, month, answer);
  return { ok: true, month, recorded: true };
}
