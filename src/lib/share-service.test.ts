import { describe, expect, it } from "vitest";

import { SHARE_EXPIRY_HOURS, SHARE_LIMITS, isShareId } from "@/lib/share";
import { type ShareRecord, type ShareStore, createShare, listShares, newShareId, readShare, stopAllShares, stopShare } from "@/lib/share-service";

/** A store in memory, with the same promises the real one makes. */
function memoryStore(options: { failSweep?: boolean; collideFirst?: number } = {}) {
  const records = new Map<string, ShareRecord>();
  let collisions = options.collideFirst ?? 0;
  const store: ShareStore = {
    async create(record) {
      if (collisions > 0) {
        collisions -= 1;
        return false;
      }
      if (records.has(record.id)) return false;
      records.set(record.id, { ...record });
      return true;
    },
    async get(id) {
      return records.get(id) ?? null;
    },
    async listByOwner(uid) {
      return [...records.values()].filter((r) => r.uid === uid);
    },
    async delete(id) {
      records.delete(id);
    },
    async deleteByOwner(uid) {
      let n = 0;
      for (const r of [...records.values()]) if (r.uid === uid) (records.delete(r.id), n++);
      return n;
    },
    async deleteExpired(now, limit) {
      if (options.failSweep) throw new Error("index missing");
      let n = 0;
      for (const r of [...records.values()]) if (r.expiresAt < now && n < limit) (records.delete(r.id), n++);
      return n;
    }
  };
  return { store, records };
}

const NOW = Date.UTC(2026, 10, 12, 9, 30);
const HOUR = 3_600_000;
const iv = "A".repeat(16);
const ct = "B".repeat(400);
const body = (hours: number = 168) => ({ iv, ct, hours });

describe("newShareId", () => {
  it("is 128 random bits written as 22 characters, and different every time", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newShareId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(isShareId(id)).toBe(true);
  });
});

describe("createShare", () => {
  it("stores the scrambled copy for the lifetime that was chosen, and says how long", async () => {
    const { store, records } = memoryStore();
    for (const hours of SHARE_EXPIRY_HOURS) {
      const result = await createShare(store, "uid-1", body(hours), NOW);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(isShareId(result.value.id)).toBe(true);
      expect(result.value.createdAt).toBe(NOW);
      expect(result.value.expiresAt).toBe(NOW + hours * HOUR);
      expect(records.get(result.value.id)).toEqual({ id: result.value.id, uid: "uid-1", iv, ct, createdAt: NOW, expiresAt: NOW + hours * HOUR });
    }
  });

  it("stores nothing but the nonce, the ciphertext, who made it and when", async () => {
    const { store, records } = memoryStore();
    await createShare(store, "uid-1", { ...body(), key: "should-never-be-here", email: "a@b.c" } as never, NOW);
    const [record] = [...records.values()];
    expect(Object.keys(record).sort()).toEqual(["createdAt", "ct", "expiresAt", "id", "iv", "uid"]);
  });

  it("refuses a lifetime it does not offer, and anything that is not scrambled text", async () => {
    const { store, records } = memoryStore();
    for (const bad of [
      { ...body(), hours: 1 },
      { ...body(), hours: 8760 },
      { ...body(), hours: "168" },
      { ...body(), iv: "short" },
      { ...body(), iv: undefined },
      { ...body(), ct: "not base64!" },
      { ...body(), ct: "A".repeat(SHARE_LIMITS.ciphertextMaxChars + 1) },
      { ...body(), ct: "A".repeat(5) },
      {}
    ]) {
      const result = await createShare(store, "uid-1", bad as never, NOW);
      expect(result, JSON.stringify(bad).slice(0, 80)).toEqual({ ok: false, status: 400, error: "invalid" });
    }
    expect(records.size).toBe(0);
  });

  it("allows five links at a time and says so on the sixth", async () => {
    const { store } = memoryStore();
    for (let i = 0; i < SHARE_LIMITS.activeMax; i++) expect((await createShare(store, "uid-1", body(), NOW + i)).ok).toBe(true);
    expect(await createShare(store, "uid-1", body(), NOW + 10)).toEqual({ ok: false, status: 409, error: "limit" });
    // Someone else is not held up by it.
    expect((await createShare(store, "uid-2", body(), NOW)).ok).toBe(true);
  });

  it("does not count links that have ended against the five", async () => {
    const { store } = memoryStore();
    for (let i = 0; i < SHARE_LIMITS.activeMax; i++) await createShare(store, "uid-1", body(24), NOW);
    const later = NOW + 25 * HOUR;
    expect((await createShare(store, "uid-1", body(), later)).ok).toBe(true);
  });

  it("tries another address if one is taken", async () => {
    const { store, records } = memoryStore({ collideFirst: 2 });
    expect((await createShare(store, "uid-1", body(), NOW)).ok).toBe(true);
    expect(records.size).toBe(1);
  });

  it("gives up cleanly if every address it tries is taken", async () => {
    const { store } = memoryStore({ collideFirst: 99 });
    expect(await createShare(store, "uid-1", body(), NOW)).toEqual({ ok: false, status: 500, error: "unavailable" });
  });

  it("clears out ended links as it goes, and a failure in doing so never fails the new link", async () => {
    const swept = memoryStore();
    await createShare(swept.store, "uid-1", body(24), NOW);
    await createShare(swept.store, "uid-2", body(), NOW + 30 * HOUR);
    expect([...swept.records.values()].map((r) => r.uid)).toEqual(["uid-2"]);

    const broken = memoryStore({ failSweep: true });
    expect((await createShare(broken.store, "uid-1", body(), NOW)).ok).toBe(true);
    expect(broken.records.size).toBe(1);
  });
});

describe("readShare", () => {
  it("gives anyone with the address the scrambled copy and its dates, and not who made it", async () => {
    const { store } = memoryStore();
    const created = await createShare(store, "uid-1", body(), NOW);
    if (!created.ok) throw new Error("setup");
    const result = await readShare(store, created.value.id, NOW + HOUR);
    expect(result).toEqual({ ok: true, value: { iv, ct, createdAt: NOW, expiresAt: NOW + 168 * HOUR } });
    expect(JSON.stringify(result)).not.toContain("uid-1");
  });

  it("says the same thing for an address that never existed, one that has ended and one that was stopped", async () => {
    const { store } = memoryStore();
    const ended = await createShare(store, "uid-1", body(24), NOW);
    const stopped = await createShare(store, "uid-1", body(), NOW);
    if (!ended.ok || !stopped.ok) throw new Error("setup");
    await stopShare(store, "uid-1", stopped.value.id);

    const never = await readShare(store, newShareId(), NOW);
    const past = await readShare(store, ended.value.id, NOW + 25 * HOUR);
    const gone = await readShare(store, stopped.value.id, NOW);
    const malformed = await readShare(store, "../../etc/passwd", NOW);
    for (const result of [never, past, gone, malformed]) expect(result).toEqual({ ok: false, status: 404, error: "not-found" });
  });

  it("deletes a copy whose time is up as soon as it is asked for", async () => {
    const { store, records } = memoryStore();
    const created = await createShare(store, "uid-1", body(24), NOW);
    if (!created.ok) throw new Error("setup");
    await readShare(store, created.value.id, NOW + 25 * HOUR);
    expect(records.size).toBe(0);
  });

  it("stops being readable at the very moment it ends", async () => {
    const { store } = memoryStore();
    const created = await createShare(store, "uid-1", body(24), NOW);
    if (!created.ok) throw new Error("setup");
    expect((await readShare(store, created.value.id, NOW + 24 * HOUR - 1)).ok).toBe(true);
    expect((await readShare(store, created.value.id, NOW + 24 * HOUR)).ok).toBe(false);
  });
});

describe("listShares", () => {
  it("lists only this person's running links, newest first, with no contents", async () => {
    const { store } = memoryStore();
    const a = await createShare(store, "uid-1", body(), NOW);
    const b = await createShare(store, "uid-1", body(), NOW + HOUR);
    await createShare(store, "uid-2", body(), NOW);
    if (!a.ok || !b.ok) throw new Error("setup");
    const result = await listShares(store, "uid-1", NOW + 2 * HOUR);
    expect(result).toEqual({
      ok: true,
      value: [
        { id: b.value.id, createdAt: NOW + HOUR, expiresAt: NOW + HOUR + 168 * HOUR },
        { id: a.value.id, createdAt: NOW, expiresAt: NOW + 168 * HOUR }
      ]
    });
    expect(JSON.stringify(result)).not.toContain(ct);
  });

  it("leaves out, and removes, links that have ended", async () => {
    const { store, records } = memoryStore();
    await createShare(store, "uid-1", body(24), NOW);
    const live = await createShare(store, "uid-1", body(720), NOW);
    if (!live.ok) throw new Error("setup");
    const result = await listShares(store, "uid-1", NOW + 48 * HOUR);
    expect(result.ok && result.value.map((s) => s.id)).toEqual([live.value.id]);
    expect(records.size).toBe(1);
  });
});

describe("stopShare and stopAllShares", () => {
  it("lets a person stop their own link, which then opens for nobody", async () => {
    const { store } = memoryStore();
    const created = await createShare(store, "uid-1", body(), NOW);
    if (!created.ok) throw new Error("setup");
    expect(await stopShare(store, "uid-1", created.value.id)).toEqual({ ok: true, value: true });
    expect((await readShare(store, created.value.id, NOW)).ok).toBe(false);
  });

  it("does not let anyone stop, or learn about, someone else's link", async () => {
    const { store, records } = memoryStore();
    const created = await createShare(store, "uid-1", body(), NOW);
    if (!created.ok) throw new Error("setup");
    expect(await stopShare(store, "uid-2", created.value.id)).toEqual({ ok: false, status: 404, error: "not-found" });
    expect(await stopShare(store, "uid-1", newShareId())).toEqual({ ok: false, status: 404, error: "not-found" });
    expect(await stopShare(store, "uid-1", "nonsense")).toEqual({ ok: false, status: 404, error: "not-found" });
    expect(records.size).toBe(1);
  });

  it("stops everything one person made and nothing of anyone else's (what deleting an account relies on)", async () => {
    const { store, records } = memoryStore();
    for (let i = 0; i < 3; i++) await createShare(store, "uid-1", body(), NOW);
    await createShare(store, "uid-2", body(), NOW);
    expect(await stopAllShares(store, "uid-1")).toEqual({ ok: true, value: 3 });
    expect([...records.values()].map((r) => r.uid)).toEqual(["uid-2"]);
    expect(await stopAllShares(store, "uid-1")).toEqual({ ok: true, value: 0 });
  });
});
