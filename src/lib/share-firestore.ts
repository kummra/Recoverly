/**
 * The real store for summary links: the server-only Firestore collection
 * `shares`, written and read with the Admin SDK. Firestore's default deny gives
 * browsers no access to it at all (like `partnerEnquiries`), so no rules change
 * was needed and none was made.
 *
 * A document is `{ uid, iv, ct, createdAt, expiresAt }` and nothing else: the
 * scrambled summary, who made it, and when it ends. The times are real
 * timestamps so that a Firestore TTL policy on `expiresAt` can be switched on
 * later as a belt-and-braces clean-up; until then expired copies are removed
 * when they are asked for, when their maker lists their links, and a few at a
 * time whenever anyone makes a new one (`share-service.ts`).
 *
 * Only plain queries are used (equality on `uid`, a range on `expiresAt`), which
 * Firestore indexes by itself, so no composite index has to be created.
 */
import type { Firestore } from "firebase-admin/firestore";

import type { ShareRecord, ShareStore } from "@/lib/share-service";

export const SHARES_COLLECTION = "shares";

/** A Timestamp, a Date or a number of milliseconds, as milliseconds. */
function millis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function toRecord(id: string, data: Record<string, unknown> | undefined): ShareRecord | null {
  if (!data) return null;
  const { uid, iv, ct } = data;
  if (typeof uid !== "string" || typeof iv !== "string" || typeof ct !== "string") return null;
  return { id, uid, iv, ct, createdAt: millis(data.createdAt), expiresAt: millis(data.expiresAt) };
}

/** Firestore's "already exists" error, however the SDK words it. */
function isAlreadyExists(error: unknown): boolean {
  const e = error as { code?: unknown; message?: unknown } | null;
  return e?.code === 6 || e?.code === "already-exists" || (typeof e?.message === "string" && /already exists|ALREADY_EXISTS/.test(e.message));
}

export function firestoreShareStore(db: Firestore): ShareStore {
  const shares = () => db.collection(SHARES_COLLECTION);

  return {
    async create(record) {
      try {
        await shares()
          .doc(record.id)
          .create({
            uid: record.uid,
            iv: record.iv,
            ct: record.ct,
            createdAt: new Date(record.createdAt),
            expiresAt: new Date(record.expiresAt)
          });
        return true;
      } catch (error) {
        if (isAlreadyExists(error)) return false;
        throw error;
      }
    },

    async get(id) {
      const snapshot = await shares().doc(id).get();
      return snapshot.exists ? toRecord(snapshot.id, snapshot.data()) : null;
    },

    async listByOwner(uid) {
      const snapshot = await shares().where("uid", "==", uid).get();
      return snapshot.docs.map((doc) => toRecord(doc.id, doc.data())).filter((r): r is ShareRecord => r !== null);
    },

    async delete(id) {
      await shares().doc(id).delete();
    },

    async deleteByOwner(uid) {
      const snapshot = await shares().where("uid", "==", uid).get();
      await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
      return snapshot.size;
    },

    async deleteExpired(now, limit) {
      const snapshot = await shares().where("expiresAt", "<", new Date(now)).limit(limit).get();
      await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
      return snapshot.size;
    }
  };
}
