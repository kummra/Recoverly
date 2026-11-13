/**
 * The real store for the monthly headcount: the server-only Firestore collection
 * `programmeCounts`, one document per programme code, written with the Admin SDK.
 * Firestore's default deny gives browsers no access to it, so no rules change was
 * needed and none was made.
 *
 * A document is `{ active: { "2026-11": 25, "2026-10": 31 } }` and nothing else:
 * numbers by month. Deliberately no `updatedAt`, no last-seen time, no uid and no
 * array of anything: a timestamp on a small programme would say when someone
 * opened the app, and a list would say who. The increment is atomic, so two people
 * ticking at once both count.
 */
import { FieldValue, type Firestore } from "firebase-admin/firestore";

import { cleanActiveCounts } from "@/lib/programme-count";
import type { CountStore } from "@/lib/programme-count-service";

export const COUNTS_COLLECTION = "programmeCounts";

export function firestoreCountStore(db: Firestore): CountStore {
  const doc = (code: string) => db.collection(COUNTS_COLLECTION).doc(code);

  return {
    async increment(code, month) {
      await doc(code).set({ active: { [month]: FieldValue.increment(1) } }, { merge: true });
    },

    async read(code) {
      const snapshot = await doc(code).get();
      return snapshot.exists ? cleanActiveCounts(snapshot.data()?.active) : {};
    }
  };
}
