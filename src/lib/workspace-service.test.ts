import { beforeEach, describe, expect, it } from "vitest";

import { toBase64Url } from "@/lib/share";
import { WORKSPACE_EXPIRY_MS, WORKSPACE_LIMITS, type WorkspaceTeam } from "@/lib/workspace";
import { type WorkspaceCopy, type WorkspaceStore, listOwnCopies, putCopy, readInbox, stopAllCopies, stopCopy } from "@/lib/workspace-service";

const KEY_ID = "0123456789abcdef0123";
const OLD_KEY_ID = "fedcba9876543210fedc";
const TEAM: WorkspaceTeam = { code: "CLINICA26", name: "Clinic A", practice: false, publicKey: null, keyId: KEY_ID };
const OTHER_TEAM: WorkspaceTeam = { code: "CLINICB26", name: "Clinic B", practice: false, publicKey: null, keyId: KEY_ID };
const PRACTICE: WorkspaceTeam = { code: "SAMPLE", name: "Sample organisation", practice: true, publicKey: null, keyId: null };

const WK = toBase64Url(new Uint8Array(256).fill(5));
const send = (over: Record<string, unknown> = {}) => ({ keyId: KEY_ID, iv: "A".repeat(16), ct: "B".repeat(80), wk: WK, ...over });
const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function memoryStore() {
  const copies = new Map<string, WorkspaceCopy>();
  const store: WorkspaceStore = {
    async listByOwner(uid) {
      return [...copies.values()].filter((c) => c.uid === uid);
    },
    async listByCode(code, limit) {
      return [...copies.values()].filter((c) => c.code === code).slice(0, limit);
    },
    async put(copy) {
      copies.set(copy.id, copy);
    },
    async delete(id) {
      copies.delete(id);
    },
    async deleteByOwner(uid) {
      let n = 0;
      for (const c of [...copies.values()]) if (c.uid === uid) (copies.delete(c.id), n++);
      return n;
    },
    async deleteByOwnerAndCode(uid, code) {
      let n = 0;
      for (const c of [...copies.values()]) if (c.uid === uid && c.code === code) (copies.delete(c.id), n++);
      return n;
    },
    async deleteExpired(now, limit) {
      let n = 0;
      for (const c of [...copies.values()]) if (c.expiresAt < now && n < limit) (copies.delete(c.id), n++);
      return n;
    }
  };
  return { store, copies };
}

let env: ReturnType<typeof memoryStore>;
beforeEach(() => {
  env = memoryStore();
});

describe("sending a copy to a team", () => {
  it("keeps the scrambled copy, who sent it and which team it is for, for thirty days", async () => {
    const result = await putCopy(env.store, TEAM, "u1", send(), NOW);
    expect(result).toEqual({ ok: true, value: { createdAt: NOW, updatedAt: NOW, expiresAt: NOW + WORKSPACE_EXPIRY_MS, stored: true } });
    const [stored] = [...env.copies.values()];
    expect(stored).toMatchObject({ uid: "u1", code: "CLINICA26", keyId: KEY_ID, createdAt: NOW, updatedAt: NOW, expiresAt: NOW + 30 * DAY });
    expect(stored.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("updates the same copy in place when the person sends again: same id, original start, new end", async () => {
    await putCopy(env.store, TEAM, "u1", send(), NOW);
    const first = [...env.copies.values()][0];
    const later = NOW + 5 * DAY;
    const result = await putCopy(env.store, TEAM, "u1", send({ ct: "C".repeat(90) }), later);
    expect(env.copies.size).toBe(1);
    const updated = [...env.copies.values()][0];
    expect(updated.id).toBe(first.id);
    expect(updated.createdAt).toBe(NOW);
    expect(updated.updatedAt).toBe(later);
    expect(updated.expiresAt).toBe(later + 30 * DAY);
    expect(updated.ct).toBe("C".repeat(90));
    expect(result).toMatchObject({ ok: true, value: { createdAt: NOW, updatedAt: later } });
  });

  it("refuses anything malformed without storing it", async () => {
    for (const bad of [{ keyId: "x" }, { iv: "short" }, { ct: "!" }, { ct: "B".repeat(WORKSPACE_LIMITS.ciphertextMaxChars + 1) }, { wk: "short" }, { keyId: undefined }]) {
      const result = await putCopy(env.store, TEAM, "u1", send(bad), NOW);
      expect(result, JSON.stringify(Object.keys(bad))).toMatchObject({ ok: false, status: 400 });
    }
    expect(env.copies.size).toBe(0);
  });

  it("says 'not found' when there is no workspace to send to, the same as for a code that does not exist", async () => {
    expect(await putCopy(env.store, null, "u1", send(), NOW)).toEqual({ ok: false, status: 404, error: "not-found" });
    expect(await putCopy(env.store, { ...TEAM, keyId: null }, "u1", send(), NOW)).toMatchObject({ ok: false, status: 404 });
  });

  it("refuses a copy made for a key the team no longer has, so the person's device asks again", async () => {
    expect(await putCopy(env.store, TEAM, "u1", send({ keyId: OLD_KEY_ID }), NOW)).toEqual({ ok: false, status: 409, error: "key-changed" });
    expect(env.copies.size).toBe(0);
  });

  it("accepts a practice send from the sample programme and stores nothing at all", async () => {
    const result = await putCopy(env.store, PRACTICE, "u1", send({ keyId: "0".repeat(20) }), NOW);
    expect(result).toMatchObject({ ok: true, value: { stored: false } });
    expect(env.copies.size).toBe(0);
  });

  it("still refuses a malformed practice send, so the sample cannot be used to try odd input on the store", async () => {
    expect(await putCopy(env.store, PRACTICE, "u1", send({ wk: "short" }), NOW)).toMatchObject({ ok: false, status: 400 });
  });

  it("limits how many teams one person can have a live copy with, but always lets them update one they have", async () => {
    const teams = ["AAAAAA26", "BBBBBB26", "CCCCCC26"].map((code) => ({ ...TEAM, code }));
    for (const t of teams) expect((await putCopy(env.store, t, "u1", send(), NOW)).ok).toBe(true);
    expect(await putCopy(env.store, { ...TEAM, code: "DDDDDD26" }, "u1", send(), NOW)).toEqual({ ok: false, status: 409, error: "limit" });
    expect((await putCopy(env.store, teams[0], "u1", send(), NOW + 1)).ok).toBe(true);
    // Someone else is not affected, and an ended copy does not count.
    expect((await putCopy(env.store, { ...TEAM, code: "DDDDDD26" }, "u2", send(), NOW)).ok).toBe(true);
    expect((await putCopy(env.store, { ...TEAM, code: "DDDDDD26" }, "u1", send(), NOW + 31 * DAY)).ok).toBe(true);
  });
});

describe("what a person sees of what they share", () => {
  it("lists their live copies newest first, saying whether each is for the team's current key", async () => {
    await putCopy(env.store, TEAM, "u1", send(), NOW);
    await putCopy(env.store, OTHER_TEAM, "u1", send(), NOW + 1000);
    const keyIds: Record<string, string | null> = { CLINICA26: KEY_ID, CLINICB26: "11111111111111111111" };
    const result = await listOwnCopies(env.store, "u1", NOW + 2000, (code) => keyIds[code] ?? null);
    expect(result).toEqual({
      ok: true,
      value: [
        { code: "CLINICB26", createdAt: NOW + 1000, updatedAt: NOW + 1000, expiresAt: NOW + 1000 + 30 * DAY, current: false },
        { code: "CLINICA26", createdAt: NOW, updatedAt: NOW, expiresAt: NOW + 30 * DAY, current: true }
      ]
    });
  });

  it("never shows anyone else's, never shows an ended one, and removes it on the way", async () => {
    await putCopy(env.store, TEAM, "u2", send(), NOW);
    await putCopy(env.store, OTHER_TEAM, "u1", send(), NOW);
    const result = await listOwnCopies(env.store, "u1", NOW + 31 * DAY, () => KEY_ID);
    expect(result).toEqual({ ok: true, value: [] });
    expect([...env.copies.values()].map((c) => c.uid)).toEqual(["u2"]);
  });

  it("stops one team's copy, or all of them, and nobody else's", async () => {
    await putCopy(env.store, TEAM, "u1", send(), NOW);
    await putCopy(env.store, OTHER_TEAM, "u1", send(), NOW);
    await putCopy(env.store, TEAM, "u2", send(), NOW);
    expect(await stopCopy(env.store, "u1", "CLINICA26")).toEqual({ ok: true, value: 1 });
    expect([...env.copies.values()].map((c) => `${c.uid}:${c.code}`).sort()).toEqual(["u1:CLINICB26", "u2:CLINICA26"]);
    expect(await stopCopy(env.store, "u1", "CLINICA26")).toEqual({ ok: true, value: 0 });
    expect(await stopAllCopies(env.store, "u1")).toEqual({ ok: true, value: 1 });
    expect([...env.copies.values()].map((c) => c.uid)).toEqual(["u2"]);
  });
});

describe("what a team is handed", () => {
  it("is the scrambled copies sent to it, most recently updated first, and nothing about who sent them", async () => {
    await putCopy(env.store, TEAM, "u1", send({ ct: "C".repeat(60) }), NOW);
    await putCopy(env.store, TEAM, "u2", send({ ct: "D".repeat(60) }), NOW + 1000);
    await putCopy(env.store, OTHER_TEAM, "u3", send(), NOW);
    const result = await readInbox(env.store, TEAM, NOW + 2000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe("Clinic A");
    expect(result.value.keyId).toBe(KEY_ID);
    expect(result.value.copies.map((c) => c.ct)).toEqual(["D".repeat(60), "C".repeat(60)]);
    // The sender's account, and which team's it is, never reach the team: only an opaque id and the times.
    for (const copy of result.value.copies) expect(Object.keys(copy).sort()).toEqual(["createdAt", "ct", "expiresAt", "id", "iv", "updatedAt", "wk"]);
    expect(JSON.stringify(result.value)).not.toMatch(/u1|u2|u3|uid|CLINICA26/);
  });

  it("leaves out copies that have ended, and ones made for a key the team no longer has", async () => {
    await putCopy(env.store, TEAM, "u1", send(), NOW);
    env.copies.set("old", { id: "old", uid: "u2", code: "CLINICA26", keyId: OLD_KEY_ID, iv: "A".repeat(16), ct: "B".repeat(60), wk: WK, createdAt: NOW, updatedAt: NOW, expiresAt: NOW + 30 * DAY });
    env.copies.set("ended", { id: "ended", uid: "u3", code: "CLINICA26", keyId: KEY_ID, iv: "A".repeat(16), ct: "B".repeat(60), wk: WK, createdAt: NOW - 40 * DAY, updatedAt: NOW - 40 * DAY, expiresAt: NOW - 10 * DAY });
    const result = await readInbox(env.store, TEAM, NOW + 1000);
    expect(result.ok && result.value.copies).toHaveLength(1);
    expect(env.copies.has("ended")).toBe(false);
  });

  it("is empty for a team that has no key yet", async () => {
    const result = await readInbox(env.store, { ...TEAM, keyId: null }, NOW);
    expect(result).toMatchObject({ ok: true, value: { keyId: null, copies: [] } });
  });
});
