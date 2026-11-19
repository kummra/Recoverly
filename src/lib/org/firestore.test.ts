import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

import { EVENTS_COLLECTION, ORGS_COLLECTION, PROGRAMMES_COLLECTION, firestoreOrgStore } from "@/lib/org/firestore";
import { type OrgProgrammeRecord, type OrgRecord, NO_FEATURES } from "@/lib/org/model";

/**
 * A fake of the small part of the Admin SDK this store uses, with the behaviours that matter: `create` fails when
 * the document exists, `undefined` is refused, a transaction reads then writes, and a query that would need a
 * composite index (more than one filter) is refused.
 */
function fakeFirestore() {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  const calls: string[] = [];
  const table = (name: string) => {
    if (![ORGS_COLLECTION, PROGRAMMES_COLLECTION, EVENTS_COLLECTION].includes(name)) throw new Error(`unexpected collection ${name}`);
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name)!;
  };
  const refuseUndefined = (value: unknown) => {
    if (value === undefined) throw new Error("Cannot use undefined as a Firestore value");
    if (value && typeof value === "object" && !(value instanceof Date)) Object.values(value).forEach(refuseUndefined);
  };
  const at = (data: Record<string, unknown>, path: string): unknown => path.split(".").reduce<unknown>((value, key) => (value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined), data);

  const ref = (name: string, id: string) => ({
    id,
    path: `${name}/${id}`,
    async create(data: Record<string, unknown>) {
      calls.push(`create ${name}/${id}`);
      refuseUndefined(data);
      if (table(name).has(id)) throw Object.assign(new Error("6 ALREADY_EXISTS"), { code: 6 });
      table(name).set(id, structuredClone(data));
    },
    async set(data: Record<string, unknown>) {
      calls.push(`set ${name}/${id}`);
      refuseUndefined(data);
      table(name).set(id, structuredClone(data));
    },
    async get() {
      calls.push(`get ${name}/${id}`);
      const data = table(name).get(id);
      return { id, exists: data !== undefined, data: () => (data ? structuredClone(data) : undefined) };
    },
    async delete() {
      calls.push(`delete ${name}/${id}`);
      table(name).delete(id);
    }
  });

  const query = (name: string, filters: Array<[string, unknown]>, order: { field: string; dir: string } | null, max: number) => ({
    where(field: string, op: string, value: unknown) {
      if (op !== "==") throw new Error(`unsupported op ${op}`);
      return query(name, [...filters, [field, value]], order, max);
    },
    orderBy(field: string, dir: string) {
      return query(name, filters, { field, dir }, max);
    },
    limit(n: number) {
      return query(name, filters, order, n);
    },
    async get() {
      calls.push(`query ${name} ${filters.map((f) => f[0]).join("&")}${order ? ` order ${order.field}` : ""}`);
      if (filters.length + (order ? 1 : 0) > 1) throw new Error("9 FAILED_PRECONDITION: The query requires an index");
      let rows = [...table(name).entries()].filter(([, data]) => filters.every(([field, value]) => at(data, field) === value));
      if (order) rows = rows.sort((a, b) => ((at(b[1], order.field) as number) - (at(a[1], order.field) as number)) * (order.dir === "desc" ? 1 : -1));
      const docs = rows.slice(0, max).map(([id, data]) => ({ id, data: () => structuredClone(data) }));
      return { docs, size: docs.length };
    }
  });

  const db = {
    collection(name: string) {
      return { doc: (id: string) => ref(name, id), where: (f: string, o: string, v: unknown) => query(name, [], null, Infinity).where(f, o, v), orderBy: (f: string, d: string) => query(name, [], null, Infinity).orderBy(f, d) };
    },
    async runTransaction<T>(fn: (tx: { get: (r: ReturnType<typeof ref>) => Promise<unknown>; set: (r: ReturnType<typeof ref>, data: Record<string, unknown>) => void }) => Promise<T>): Promise<T> {
      const writes: Array<() => Promise<void>> = [];
      const result = await fn({
        get: (r) => r.get(),
        set: (r, data) => {
          refuseUndefined(data);
          writes.push(() => r.set(data));
        }
      });
      for (const write of writes) await write();
      return result;
    }
  };
  return { db: db as unknown as Firestore, collections, calls, table };
}

const org = (over: Partial<OrgRecord> = {}): OrgRecord => ({
  id: "u1",
  name: "Acme Logistics",
  kind: "workplace",
  contactEmail: "ops@acme.example",
  kindVerified: false,
  createdAt: 1000,
  updatedAt: 1000,
  termsAcceptedAt: 1000,
  termsVersion: "2026-11",
  subscription: null,
  purchases: [],
  ...over
});

const draft = { name: "Acme depot", welcome: { en: "Welcome to the Acme programme." }, contacts: [{ label: "EAP", phone: "9876543210" }] };
const programme = (over: Partial<OrgProgrammeRecord> = {}): OrgProgrammeRecord => ({
  code: "ABCD2345EF",
  ownerUid: "u1",
  createdAt: 1000,
  updatedAt: 1000,
  content: null,
  draft,
  reviewState: "pending",
  features: { ...NO_FEATURES },
  ...over
});

describe("firestoreOrgStore: organisations", () => {
  it("creates once, says false when it already exists, and reads back what it wrote", async () => {
    const { db } = fakeFirestore();
    const store = firestoreOrgStore(db);
    expect(await store.createOrg(org())).toBe(true);
    expect(await store.createOrg(org({ name: "Other" }))).toBe(false);
    expect(await store.getOrg("u1")).toEqual(org());
    expect(await store.getOrg("nobody")).toBeNull();
  });

  it("never sends an undefined value to Firestore, however many optional fields are missing", async () => {
    const { db } = fakeFirestore();
    const store = firestoreOrgStore(db);
    await expect(store.createOrg(org({ contactEmail: null, subscription: { source: "stripe", plan: "clinic", status: "active", currentPeriodEnd: 5, cancelAtPeriodEnd: false, updatedAt: 1, customerId: undefined } }))).resolves.toBe(true);
    await expect(store.createProgramme(programme({ reviewNote: undefined, workspacePublicKey: undefined }))).resolves.toBe(true);
  });

  it("changes a record inside a transaction, and leaves it alone when the change says nothing", async () => {
    const { db } = fakeFirestore();
    const store = firestoreOrgStore(db);
    await store.createOrg(org());
    expect((await store.updateOrg("u1", (o) => (o ? { ...o, name: "New name" } : null)))?.name).toBe("New name");
    expect((await store.updateOrg("u1", () => null))?.name).toBe("New name");
    expect(await store.updateOrg("missing", () => null)).toBeNull();
  });

  it("finds an organisation by its Stripe customer and by its roll-up link, and lists the newest first", async () => {
    const { db } = fakeFirestore();
    const store = firestoreOrgStore(db);
    const hash = "a".repeat(64);
    await store.createOrg(org({ subscription: { source: "stripe", plan: "network", status: "active", currentPeriodEnd: 9, cancelAtPeriodEnd: false, updatedAt: 1, customerId: "cus_1" }, rollupKeyHash: hash }));
    await store.createOrg(org({ id: "u2", name: "Newer", createdAt: 5000 }));
    expect((await store.orgByCustomerId("cus_1"))?.id).toBe("u1");
    expect(await store.orgByCustomerId("cus_x")).toBeNull();
    expect((await store.orgByRollupHash(hash))?.id).toBe("u1");
    expect((await store.listOrgs(10)).map((o) => o.id)).toEqual(["u2", "u1"]);
  });

  it("ignores a stored document that is not a usable organisation", async () => {
    const { db, table } = fakeFirestore();
    table(ORGS_COLLECTION).set("bad", { name: "", kind: "workplace" });
    table(ORGS_COLLECTION).set("worse", { name: "X", kind: "spaceship" });
    const store = firestoreOrgStore(db);
    expect(await store.getOrg("bad")).toBeNull();
    expect(await store.getOrg("worse")).toBeNull();
  });
});

describe("firestoreOrgStore: programmes", () => {
  it("creates, reads, updates and deletes a programme", async () => {
    const { db } = fakeFirestore();
    const store = firestoreOrgStore(db);
    expect(await store.createProgramme(programme())).toBe(true);
    expect(await store.createProgramme(programme())).toBe(false);
    expect((await store.getProgramme("ABCD2345EF"))?.draft.name).toBe("Acme depot");
    await store.updateProgramme("ABCD2345EF", (p) => (p ? { ...p, reviewState: "approved", content: p.draft } : null));
    expect((await store.getProgramme("ABCD2345EF"))?.content?.name).toBe("Acme depot");
    await store.deleteProgramme("ABCD2345EF");
    expect(await store.getProgramme("ABCD2345EF")).toBeNull();
  });

  it("lists one owner's programmes, finds one by its report link hash, and lists those waiting for review", async () => {
    const { db } = fakeFirestore();
    const store = firestoreOrgStore(db);
    const hash = "b".repeat(64);
    await store.createProgramme(programme({ code: "AAAA2222BB", features: { ...NO_FEATURES, headcount: true }, reportKeyHash: hash }));
    await store.createProgramme(programme({ code: "CCCC3333DD", reviewState: "approved" }));
    await store.createProgramme(programme({ code: "EEEE4444FF", ownerUid: "u2" }));
    expect((await store.programmesByOwner("u1")).map((p) => p.code).sort()).toEqual(["AAAA2222BB", "CCCC3333DD"]);
    expect((await store.programmeByReportHash(hash))?.code).toBe("AAAA2222BB");
    expect(await store.programmeByReportHash("c".repeat(64))).toBeNull();
    expect((await store.programmesByReview("pending", 10)).map((p) => p.code).sort()).toEqual(["AAAA2222BB", "EEEE4444FF"]);
  });

  it("turns off every count when a stored report has no key, and drops a key when the report is off", async () => {
    const { db, table } = fakeFirestore();
    const store = firestoreOrgStore(db);
    table(PROGRAMMES_COLLECTION).set("NOKEY22222", { ...JSON.parse(JSON.stringify(programme({ code: "NOKEY22222" }))), features: { headcount: true, figures: true, challenge: true, workspace: true } });
    table(PROGRAMMES_COLLECTION).set("OFFKEY2222", { ...JSON.parse(JSON.stringify(programme({ code: "OFFKEY2222" }))), features: { headcount: false, figures: true }, reportKeyHash: "d".repeat(64) });
    expect((await store.getProgramme("NOKEY22222"))?.features).toEqual({ headcount: false, figures: false, challenge: false, workspace: false });
    const off = await store.getProgramme("OFFKEY2222");
    expect(off?.reportKeyHash).toBeUndefined();
    expect(off?.features.figures).toBe(false);
  });
});

describe("firestoreOrgStore: events", () => {
  it("remembers a handled event", async () => {
    const { db } = fakeFirestore();
    const store = firestoreOrgStore(db);
    expect(await store.eventSeen("evt_1")).toBe(false);
    await store.markEvent("evt_1", 100, "customer.subscription.updated");
    expect(await store.eventSeen("evt_1")).toBe(true);
  });

  it("only ever asks for single-field queries, which need no index to be created", async () => {
    const { db, calls } = fakeFirestore();
    const store = firestoreOrgStore(db);
    await store.orgByCustomerId("cus_1");
    await store.orgByRollupHash("a".repeat(64));
    await store.listOrgs(5);
    await store.programmesByOwner("u1");
    await store.programmeByReportHash("a".repeat(64));
    await store.programmesByReview("pending", 5);
    expect(calls.filter((c) => c.startsWith("query"))).toEqual([
      "query organisations subscription.customerId",
      "query organisations rollupKeyHash",
      "query organisations  order createdAt",
      "query orgProgrammes ownerUid",
      "query orgProgrammes reportKeyHash",
      "query orgProgrammes reviewState"
    ]);
  });
});
