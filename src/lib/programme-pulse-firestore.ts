/**
 * The real store for the monthly question: the server-only Firestore collection `programmePulse`, one document per programme code,
 * written with the Admin SDK (Firestore's default deny gives browsers no access, so no rules change was needed and none was made).
 *
 * A document is `{ months: { "2026-11": { a1: 0, a2: 1, a3: 4, a4: 9, a5: 12 } } }` and nothing else: numbers by month and answer.
 * Deliberately no `updatedAt`, no uid, no array of anything: a timestamp on a small programme would say when someone answered,
 * and a list would say who. The increment is atomic, so two people answering at once both count.
 */
import { FieldValue, type Firestore } from "firebase-admin/firestore";

import { cleanPulseMonths } from "@/lib/programme-pulse";
import type { PulseStore } from "@/lib/programme-pulse-service";

export const PULSE_COLLECTION = "programmePulse";

export function firestorePulseStore(db: Firestore): PulseStore {
  const doc = (code: string) => db.collection(PULSE_COLLECTION).doc(code);
  return {
    async add(code, month, answer) {
      await doc(code).set({ months: { [month]: { [`a${answer}`]: FieldValue.increment(1) } } }, { merge: true });
    },
    async read(code) {
      const snapshot = await doc(code).get();
      return snapshot.exists ? cleanPulseMonths(snapshot.data()?.months) : {};
    }
  };
}
