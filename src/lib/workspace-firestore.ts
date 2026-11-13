/**
 * The real store for team workspaces: the server-only Firestore collection `workspaceCopies`,
 * written and read with the Admin SDK. Firestore's default deny gives browsers no access to it
 * at all (like `shares` and `partnerEnquiries`), so no rules change was needed and none was made.
 *
 * A document is `{ uid, code, keyId, iv, ct, wk, createdAt, updatedAt, expiresAt }`: the
 * scrambled summary, the scrambled key for it, which team and key it is for, who sent it and
 * when it ends. Nothing in it can be read without the team's private key. The times are real
 * timestamps so that a Firestore TTL policy on `expiresAt` can be switched on later as a
 * belt-and-braces clean-up; until then expired copies are removed when they are asked for, when
 * their sender lists theirs, and a few at a time whenever anyone sends one.
 *
 * Only plain queries are used (equality on `uid` or `code`, a range on `expiresAt`), which
 * Firestore indexes by itself, so no composite index has to be created.
 */
import type { Firestore } from "firebase-admin/firestore";

import type { WorkspaceCopy, WorkspaceStore } from "@/lib/workspace-service";

export const WORKSPACE_COLLECTION = "workspaceCopies";

/** A Timestamp, a Date or a number of milliseconds, as milliseconds. */
function millis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function toCopy(id: string, data: Record<string, unknown> | undefined): WorkspaceCopy | null {
  if (!data) return null;
  const { uid, code, keyId, iv, ct, wk } = data;
  if ([uid, code, keyId, iv, ct, wk].some((field) => typeof field !== "string")) return null;
  return {
    id,
    uid: uid as string,
    code: code as string,
    keyId: keyId as string,
    iv: iv as string,
    ct: ct as string,
    wk: wk as string,
    createdAt: millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
    expiresAt: millis(data.expiresAt)
  };
}

export function firestoreWorkspaceStore(db: Firestore): WorkspaceStore {
  const copies = () => db.collection(WORKSPACE_COLLECTION);
  const docsToCopies = (docs: Array<{ id: string; data: () => Record<string, unknown> | undefined }>) =>
    docs.map((doc) => toCopy(doc.id, doc.data())).filter((copy): copy is WorkspaceCopy => copy !== null);

  return {
    async listByOwner(uid) {
      return docsToCopies((await copies().where("uid", "==", uid).get()).docs);
    },

    async listByCode(code, limit) {
      return docsToCopies((await copies().where("code", "==", code).limit(limit).get()).docs);
    },

    async put(copy) {
      await copies()
        .doc(copy.id)
        .set({
          uid: copy.uid,
          code: copy.code,
          keyId: copy.keyId,
          iv: copy.iv,
          ct: copy.ct,
          wk: copy.wk,
          createdAt: new Date(copy.createdAt),
          updatedAt: new Date(copy.updatedAt),
          expiresAt: new Date(copy.expiresAt)
        });
    },

    async delete(id) {
      await copies().doc(id).delete();
    },

    async deleteByOwner(uid) {
      const snapshot = await copies().where("uid", "==", uid).get();
      await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
      return snapshot.size;
    },

    async deleteByOwnerAndCode(uid, code) {
      const snapshot = await copies().where("uid", "==", uid).get();
      const mine = snapshot.docs.filter((doc) => doc.data().code === code);
      await Promise.all(mine.map((doc) => doc.ref.delete()));
      return mine.length;
    },

    async deleteExpired(now, limit) {
      const snapshot = await copies().where("expiresAt", "<", new Date(now)).limit(limit).get();
      await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
      return snapshot.size;
    }
  };
}
