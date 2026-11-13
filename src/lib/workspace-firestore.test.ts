import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

import { WORKSPACE_COLLECTION, firestoreWorkspaceStore } from "@/lib/workspace-firestore";
import type { WorkspaceCopy } from "@/lib/workspace-service";

/**
 * A fake of the small part of the Admin SDK this store uses, with Firestore's own behaviours that
 * matter here: values come back as Timestamps (with `toMillis`), `undefined` is refused, and a
 * query that would need a composite index (two filters) is refused, so the store cannot quietly
 * depend on an index nobody created.
 */
function fakeFirestore() {
  const docs = new Map<string, Record<string, unknown>>();
  const timestamp = (date: Date) => ({ toMillis: () => date.getTime() });
  const store = (data: Record<string, unknown>) => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v instanceof Date ? timestamp(v) : v]));
  const ref = (id: string) => ({
    id,
    async set(data: Record<string, unknown>) {
      for (const value of Object.values(data)) if (value === undefined) throw new Error("Cannot use undefined as a Firestore value");
      docs.set(id, store(data));
    },
    async delete() {
      docs.delete(id);
    }
  });
  const query = (filters: Array<[string, string, unknown]>, max = Infinity) => ({
    where: (field: string, op: string, value: unknown) => query([...filters, [field, op, value]], max),
    limit: (n: number) => query(filters, n),
    async get() {
      if (filters.length > 1) throw new Error("9 FAILED_PRECONDITION: The query requires an index");
      const matches = [...docs.entries()].filter(([, data]) =>
        filters.every(([field, op, value]) => {
          const actual = data[field] as { toMillis?: () => number } | string;
          if (op === "==") return actual === value;
          if (op === "<") return (actual as { toMillis: () => number }).toMillis() < (value as Date).getTime();
          throw new Error(`unsupported op ${op}`);
        })
      );
      const selected = matches.slice(0, max).map(([id, data]) => ({ id, data: () => data, ref: ref(id) }));
      return { docs: selected, size: selected.length };
    }
  });
  const db = {
    collection(name: string) {
      if (name !== WORKSPACE_COLLECTION) throw new Error(`unexpected collection ${name}`);
      return { doc: (id: string) => ref(id), where: (f: string, o: string, v: unknown) => query([[f, o, v]]) };
    }
  };
  return { db: db as unknown as Firestore, docs };
}

const copy = (over: Partial<WorkspaceCopy> = {}): WorkspaceCopy => ({
  id: "id1",
  uid: "u1",
  code: "CLINICA26",
  keyId: "0123456789abcdef0123",
  iv: "A".repeat(16),
  ct: "B".repeat(60),
  wk: "C".repeat(342),
  createdAt: 1_000,
  updatedAt: 2_000,
  expiresAt: 5_000,
  ...over
});

describe("firestoreWorkspaceStore", () => {
  it("writes a document of exactly nine fields to the server-only `workspaceCopies` collection, and nothing readable", async () => {
    const { db, docs } = fakeFirestore();
    await firestoreWorkspaceStore(db).put(copy());
    expect(Object.keys(docs.get("id1") ?? {}).sort()).toEqual(["code", "createdAt", "ct", "expiresAt", "iv", "keyId", "uid", "updatedAt", "wk"]);
  });

  it("stores the times as Timestamps (so a TTL policy on expiresAt can be used) and reads them back as milliseconds", async () => {
    const { db, docs } = fakeFirestore();
    const store = firestoreWorkspaceStore(db);
    await store.put(copy());
    expect(typeof (docs.get("id1")?.expiresAt as { toMillis: unknown }).toMillis).toBe("function");
    expect(await store.listByOwner("u1")).toEqual([copy()]);
  });

  it("replaces a copy with the same id when the person updates", async () => {
    const { db } = fakeFirestore();
    const store = firestoreWorkspaceStore(db);
    await store.put(copy());
    await store.put(copy({ ct: "D".repeat(60), updatedAt: 3_000 }));
    expect(await store.listByOwner("u1")).toEqual([copy({ ct: "D".repeat(60), updatedAt: 3_000 })]);
  });

  it("lists by sender and by team with one-field queries only, and a team's list is capped", async () => {
    const { db } = fakeFirestore();
    const store = firestoreWorkspaceStore(db);
    await store.put(copy({ id: "a", uid: "u1", code: "CLINICA26" }));
    await store.put(copy({ id: "b", uid: "u2", code: "CLINICA26" }));
    await store.put(copy({ id: "c", uid: "u1", code: "CLINICB26" }));
    expect((await store.listByOwner("u1")).map((c) => c.id).sort()).toEqual(["a", "c"]);
    expect((await store.listByCode("CLINICA26", 10)).map((c) => c.id).sort()).toEqual(["a", "b"]);
    expect(await store.listByCode("CLINICA26", 1)).toHaveLength(1);
  });

  it("deletes one sender's copy for one team without touching their others or anyone else's, using a single-field query", async () => {
    const { db, docs } = fakeFirestore();
    const store = firestoreWorkspaceStore(db);
    await store.put(copy({ id: "a", uid: "u1", code: "CLINICA26" }));
    await store.put(copy({ id: "b", uid: "u2", code: "CLINICA26" }));
    await store.put(copy({ id: "c", uid: "u1", code: "CLINICB26" }));
    expect(await store.deleteByOwnerAndCode("u1", "CLINICA26")).toBe(1);
    expect([...docs.keys()].sort()).toEqual(["b", "c"]);
    expect(await store.deleteByOwner("u1")).toBe(1);
    expect([...docs.keys()]).toEqual(["b"]);
  });

  it("removes copies whose time is up, a few at a time", async () => {
    const { db, docs } = fakeFirestore();
    const store = firestoreWorkspaceStore(db);
    for (const [i, expiresAt] of [100, 200, 300, 9_000].entries()) await store.put(copy({ id: `c${i}`, expiresAt }));
    expect(await store.deleteExpired(1_000, 2)).toBe(2);
    expect(docs.size).toBe(2);
    expect(await store.deleteExpired(1_000, 10)).toBe(1);
    expect([...docs.keys()]).toEqual(["c3"]);
  });

  it("ignores a document that is missing a field rather than returning half of one", async () => {
    const { db, docs } = fakeFirestore();
    docs.set("broken", { uid: "u1", code: "CLINICA26" });
    expect(await firestoreWorkspaceStore(db).listByOwner("u1")).toEqual([]);
  });
});
