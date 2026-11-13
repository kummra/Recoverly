import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

import { SHARES_COLLECTION, firestoreShareStore } from "@/lib/share-firestore";

/**
 * A fake of the small part of the Admin SDK this store uses, with Firestore's
 * own behaviours that matter here: `create` fails when the document exists,
 * values come back as Timestamps (with `toMillis`), a missing document says so,
 * and a query that asks for something an index would be needed for is refused.
 */
function fakeFirestore() {
  const docs = new Map<string, Record<string, unknown>>();
  const calls: string[] = [];

  const timestamp = (date: Date) => ({ toMillis: () => date.getTime() });
  const store = (data: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v instanceof Date ? timestamp(v) : v]));
  const ref = (id: string) => ({
    id,
    async create(data: Record<string, unknown>) {
      calls.push(`create ${id}`);
      for (const value of Object.values(data)) if (value === undefined) throw new Error("Cannot use undefined as a Firestore value");
      if (docs.has(id)) throw Object.assign(new Error("6 ALREADY_EXISTS: Document already exists"), { code: 6 });
      docs.set(id, store(data));
    },
    async get() {
      calls.push(`get ${id}`);
      const data = docs.get(id);
      return { id, exists: data !== undefined, data: () => data };
    },
    async delete() {
      calls.push(`delete ${id}`);
      docs.delete(id);
    }
  });

  const query = (filters: Array<[string, string, unknown]>, max = Infinity) => ({
    where(field: string, op: string, value: unknown) {
      return query([...filters, [field, op, value]], max);
    },
    limit(n: number) {
      return query(filters, n);
    },
    async get() {
      calls.push(`query ${filters.map((f) => f.slice(0, 2).join(" ")).join(" & ")}`);
      // Firestore indexes single fields by itself: one equality or one range, never a mix without a composite index.
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
      if (name !== SHARES_COLLECTION) throw new Error(`unexpected collection ${name}`);
      return { doc: (id: string) => ref(id), where: (f: string, o: string, v: unknown) => query([[f, o, v]]) };
    }
  };
  return { db: db as unknown as Firestore, docs, calls };
}

const record = (id: string, uid: string, expiresAt: number) => ({ id, uid, iv: "A".repeat(16), ct: "B".repeat(60), createdAt: 1_000, expiresAt });

describe("firestoreShareStore", () => {
  it("writes a document of exactly five fields to the server-only `shares` collection", async () => {
    const { db, docs } = fakeFirestore();
    expect(await firestoreShareStore(db).create(record("id1", "u1", 5_000))).toBe(true);
    expect(Object.keys(docs.get("id1") ?? {}).sort()).toEqual(["createdAt", "ct", "expiresAt", "iv", "uid"]);
  });

  it("stores the times as Timestamps (so a TTL policy on expiresAt can be used) and reads them back as milliseconds", async () => {
    const { db, docs } = fakeFirestore();
    const store = firestoreShareStore(db);
    await store.create(record("id1", "u1", 5_000));
    expect(typeof (docs.get("id1")?.expiresAt as { toMillis: () => number }).toMillis).toBe("function");
    expect(await store.get("id1")).toEqual(record("id1", "u1", 5_000));
  });

  it("says false, not an error, when the address is taken, and lets other errors through", async () => {
    const { db } = fakeFirestore();
    const store = firestoreShareStore(db);
    expect(await store.create(record("id1", "u1", 5_000))).toBe(true);
    expect(await store.create(record("id1", "u2", 9_000))).toBe(false);
    // A real failure is not mistaken for a collision.
    const broken = { collection: () => ({ doc: () => ({ create: async () => Promise.reject(Object.assign(new Error("14 UNAVAILABLE"), { code: 14 })) }) }) } as unknown as Firestore;
    await expect(firestoreShareStore(broken).create(record("id2", "u1", 5_000))).rejects.toThrow("UNAVAILABLE");
  });

  it("returns null for a document that is not there or is malformed", async () => {
    const { db, docs } = fakeFirestore();
    const store = firestoreShareStore(db);
    expect(await store.get("missing")).toBeNull();
    docs.set("odd", { uid: 5, iv: "x" });
    expect(await store.get("odd")).toBeNull();
  });

  it("lists, and removes, one person's documents only", async () => {
    const { db, docs } = fakeFirestore();
    const store = firestoreShareStore(db);
    await store.create(record("a", "u1", 5_000));
    await store.create(record("b", "u1", 6_000));
    await store.create(record("c", "u2", 7_000));
    expect((await store.listByOwner("u1")).map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(await store.deleteByOwner("u1")).toBe(2);
    expect([...docs.keys()]).toEqual(["c"]);
  });

  it("removes expired documents, a few at a time", async () => {
    const { db, docs } = fakeFirestore();
    const store = firestoreShareStore(db);
    for (let i = 0; i < 5; i++) await store.create(record(`old${i}`, "u1", 1_000 + i));
    await store.create(record("live", "u1", 99_000));
    expect(await store.deleteExpired(50_000, 3)).toBe(3);
    expect(docs.size).toBe(3);
    expect(await store.deleteExpired(50_000, 20)).toBe(2);
    expect([...docs.keys()]).toEqual(["live"]);
  });

  it("only ever asks Firestore for single-field queries, which need no index to be created", async () => {
    const { db, calls } = fakeFirestore();
    const store = firestoreShareStore(db);
    await store.create(record("a", "u1", 5_000));
    await store.listByOwner("u1");
    await store.deleteByOwner("u1");
    await store.deleteExpired(9_000, 20);
    expect(calls.filter((c) => c.startsWith("query"))).toEqual(["query uid ==", "query uid ==", "query expiresAt <"]);
  });
});
