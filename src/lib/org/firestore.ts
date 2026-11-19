/**
 * The real organisation store: three server-only Firestore collections written and read with the Admin SDK.
 * Firestore's default deny gives browsers no access to them at all (like `shares` and `partnerEnquiries`), so
 * no rules change was needed and none was made.
 *
 *   organisations/{ownerUid}    who the organisation is and its subscription
 *   orgProgrammes/{CODE}        one programme: live words, draft, which counts are on, key hashes
 *   billingEvents/{eventId}     payment-provider events already handled (so a retry changes nothing)
 *
 * Only single-field queries (equality, or one ordering), which Firestore indexes by itself, so no composite
 * index has to be created. Records are written as plain JSON (no `undefined`, which Firestore refuses).
 */
import type { Firestore } from "firebase-admin/firestore";

import { type OrgProgrammeRecord, type OrgRecord, type ReviewState, parseOrg, parseProgramme } from "@/lib/org/model";
import type { OrgStore } from "@/lib/org/store";

export const ORGS_COLLECTION = "organisations";
export const PROGRAMMES_COLLECTION = "orgProgrammes";
export const EVENTS_COLLECTION = "billingEvents";

const plain = (record: object): Record<string, unknown> => JSON.parse(JSON.stringify(record)) as Record<string, unknown>;

function isAlreadyExists(error: unknown): boolean {
  const e = error as { code?: unknown; message?: unknown } | null;
  return e?.code === 6 || e?.code === "already-exists" || (typeof e?.message === "string" && /already exists|ALREADY_EXISTS/.test(e.message));
}

export function firestoreOrgStore(db: Firestore): OrgStore {
  const orgs = () => db.collection(ORGS_COLLECTION);
  const programmes = () => db.collection(PROGRAMMES_COLLECTION);
  const events = () => db.collection(EVENTS_COLLECTION);

  const orgFrom = (doc: { id: string; data: () => Record<string, unknown> | undefined }) => parseOrg(doc.id, doc.data());
  const programmeFrom = (doc: { id: string; data: () => Record<string, unknown> | undefined }) => parseProgramme(doc.id, doc.data());
  const firstOrg = (docs: Array<{ id: string; data: () => Record<string, unknown> | undefined }>) => {
    for (const doc of docs) {
      const org = orgFrom(doc);
      if (org) return org;
    }
    return null;
  };

  return {
    async getOrg(id) {
      const snapshot = await orgs().doc(id).get();
      return snapshot.exists ? orgFrom(snapshot) : null;
    },

    async createOrg(org) {
      try {
        await orgs().doc(org.id).create(plain(org));
        return true;
      } catch (error) {
        if (isAlreadyExists(error)) return false;
        throw error;
      }
    },

    async updateOrg(id, change) {
      const ref = orgs().doc(id);
      return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const current = snapshot.exists ? orgFrom(snapshot) : null;
        const next = change(current);
        if (!next) return current;
        tx.set(ref, plain(next));
        return next;
      });
    },

    async orgByCustomerId(customerId) {
      const snapshot = await orgs().where("subscription.customerId", "==", customerId).limit(1).get();
      return firstOrg(snapshot.docs);
    },

    async orgByRollupHash(hash) {
      const snapshot = await orgs().where("rollupKeyHash", "==", hash).limit(1).get();
      return firstOrg(snapshot.docs);
    },

    async listOrgs(limit) {
      const snapshot = await orgs().orderBy("createdAt", "desc").limit(limit).get();
      return snapshot.docs.map(orgFrom).filter((o): o is OrgRecord => o !== null);
    },

    async getProgramme(code) {
      const snapshot = await programmes().doc(code).get();
      return snapshot.exists ? programmeFrom(snapshot) : null;
    },

    async createProgramme(record) {
      try {
        await programmes().doc(record.code).create(plain(record));
        return true;
      } catch (error) {
        if (isAlreadyExists(error)) return false;
        throw error;
      }
    },

    async updateProgramme(code, change) {
      const ref = programmes().doc(code);
      return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const current = snapshot.exists ? programmeFrom(snapshot) : null;
        const next = change(current);
        if (!next) return current;
        tx.set(ref, plain(next));
        return next;
      });
    },

    async deleteProgramme(code) {
      await programmes().doc(code).delete();
    },

    async programmesByOwner(uid) {
      const snapshot = await programmes().where("ownerUid", "==", uid).get();
      return snapshot.docs.map(programmeFrom).filter((p): p is OrgProgrammeRecord => p !== null);
    },

    async programmeByReportHash(hash) {
      const snapshot = await programmes().where("reportKeyHash", "==", hash).limit(1).get();
      for (const doc of snapshot.docs) {
        const record = programmeFrom(doc);
        if (record) return record;
      }
      return null;
    },

    async programmesByReview(state: ReviewState, limit) {
      const snapshot = await programmes().where("reviewState", "==", state).limit(limit).get();
      return snapshot.docs.map(programmeFrom).filter((p): p is OrgProgrammeRecord => p !== null);
    },

    async eventSeen(id) {
      const snapshot = await events().doc(id).get();
      return snapshot.exists;
    },

    async markEvent(id, created, type) {
      await events().doc(id).set({ created, type, handledAt: new Date() });
    }
  };
}
