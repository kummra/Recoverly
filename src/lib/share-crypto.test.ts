import { describe, expect, it } from "vitest";

import { type ShareFacts, buildSnapshot, fromBase64Url, toBase64Url } from "@/lib/share";
import { cryptoAvailable, openSnapshot, sealSnapshot } from "@/lib/share-crypto";

const FACTS: ShareFacts = {
  recordsSince: new Date(2026, 8, 3),
  totalLogged: 41,
  monthMl: 1200,
  previousMonthMl: 3000,
  dailyAverageMl: 100,
  currentStreakDays: 6,
  longestStreakDays: 11,
  freeDaysThisMonth: 9,
  daysThisMonth: 12,
  weeklyGoalMl: 500,
  audit: { score: 14, date: new Date(2026, 9, 20), assessments: 2 },
  cravings: { total: 7, passed: 5, avgIntensity: 3.4 },
  patterns: [{ labelKey: "trigger.fridays", share: 0.31 }],
  motivation: "मेरी बेटी",
  note: "I want to ask about sleep.",
  plans: [{ when: "after work", then: "walk" }]
};

const snapshot = () => buildSnapshot(FACTS, ["progress", "audit", "cravings", "patterns", "why", "notes", "plans"], { now: new Date("2026-11-12T09:30:00Z"), label: "Ravi" });

describe("share crypto", () => {
  it("has Web Crypto here", () => {
    expect(cryptoAvailable()).toBe(true);
  });

  it("opens exactly what was sealed, including non-English text", async () => {
    const sealed = await sealSnapshot(snapshot());
    expect(await openSnapshot(sealed)).toEqual(snapshot());
  });

  it("produces a 256-bit key, a 96-bit nonce and a ciphertext that is not the text", async () => {
    const { key, iv, ct } = await sealSnapshot(snapshot());
    expect(fromBase64Url(key)?.length).toBe(32);
    expect(fromBase64Url(iv)?.length).toBe(12);
    expect(key).toHaveLength(43);
    expect(iv).toHaveLength(16);
    const plaintext = JSON.stringify(snapshot());
    // 16 bytes of authentication tag on top of the text.
    expect(fromBase64Url(ct)?.length).toBe(new TextEncoder().encode(plaintext).length + 16);
    expect(ct).not.toContain("Ravi");
    expect(Buffer.from(fromBase64Url(ct) ?? []).toString("utf8")).not.toContain("Ravi");
    expect(Buffer.from(fromBase64Url(ct) ?? []).toString("latin1")).not.toContain("sleep");
  });

  it("uses a new key and a new nonce every time, so a key is never reused", async () => {
    const keys = new Set<string>();
    const nonces = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const { key, iv } = await sealSnapshot(snapshot());
      keys.add(key);
      nonces.add(iv);
    }
    expect(keys.size).toBe(25);
    expect(nonces.size).toBe(25);
  });

  it("will not open with a different key", async () => {
    const sealed = await sealSnapshot(snapshot());
    const other = await sealSnapshot(snapshot());
    expect(await openSnapshot({ ...sealed, key: other.key })).toBeNull();
  });

  it("will not open if the stored copy was changed, even by one bit", async () => {
    const sealed = await sealSnapshot(snapshot());
    const bytes = fromBase64Url(sealed.ct) as Uint8Array;
    for (const index of [0, Math.floor(bytes.length / 2), bytes.length - 1]) {
      const changed = new Uint8Array(bytes);
      changed[index] ^= 1;
      expect(await openSnapshot({ ...sealed, ct: toBase64Url(changed) }), `byte ${index}`).toBeNull();
    }
    const iv = new Uint8Array(fromBase64Url(sealed.iv) as Uint8Array);
    iv[0] ^= 1;
    expect(await openSnapshot({ ...sealed, iv: toBase64Url(iv) })).toBeNull();
  });

  it("will not open a copy cut short, a key cut short, or nonsense", async () => {
    const sealed = await sealSnapshot(snapshot());
    expect(await openSnapshot({ ...sealed, ct: sealed.ct.slice(0, -4) })).toBeNull();
    expect(await openSnapshot({ ...sealed, key: sealed.key.slice(0, -1) })).toBeNull();
    expect(await openSnapshot({ ...sealed, iv: "short" })).toBeNull();
    expect(await openSnapshot({ key: "!!", iv: "!!", ct: "!!" })).toBeNull();
    expect(await openSnapshot({ key: sealed.key, iv: sealed.iv, ct: "" })).toBeNull();
  });

  it("shows only what the viewer's own cleaning allows: a link made by someone else cannot add to the page", async () => {
    // A hostile person makes their own valid link around a payload with extras.
    const { subtle } = globalThis.crypto;
    const rawKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt"]);
    const payload = JSON.stringify({ ...snapshot(), html: "<script>alert(1)</script>", label: "x".repeat(500) });
    const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(payload)));
    const opened = await openSnapshot({ key: toBase64Url(rawKey), iv: toBase64Url(iv), ct: toBase64Url(ct) });
    expect(opened).not.toBeNull();
    expect((opened as unknown as Record<string, unknown>).html).toBeUndefined();
    expect(opened?.label?.length).toBe(40);
  });

  it("refuses an opened payload that is not a summary", async () => {
    const { subtle } = globalThis.crypto;
    const rawKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt"]);
    for (const payload of ["not json", "[]", JSON.stringify({ v: 2 })]) {
      const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(payload)));
      expect(await openSnapshot({ key: toBase64Url(rawKey), iv: toBase64Url(iv), ct: toBase64Url(ct) }), payload).toBeNull();
    }
  });
});
