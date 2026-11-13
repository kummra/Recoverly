import { afterEach, describe, expect, it, vi } from "vitest";

import { type ShareFacts, buildSnapshot, parseShareId, parseShareKey } from "@/lib/share";
import { createShareLink, fetchSharedCopy, listOwnShares, stopAllOwnShares, stopOwnShare } from "@/lib/share-client";
import { openSnapshot } from "@/lib/share-crypto";

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
  audit: null,
  cravings: null,
  patterns: [],
  motivation: null,
  note: "Please ask about my secret sleep problem.",
  plans: []
};
const snapshot = () => buildSnapshot(FACTS, ["progress", "notes"], { now: new Date("2026-11-12T09:30:00Z"), label: "Ravi" });

const ID = "Q".repeat(22);
const json = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("createShareLink", () => {
  const options = (fetchImpl: typeof fetch) => ({ snapshot: snapshot(), hours: 168 as const, token: "id-token", origin: "https://recoverly.co.in", fetchImpl });

  it("sends only the nonce, the ciphertext and the lifetime, signed in, and keeps the key out of every request", async () => {
    const fetchImpl = vi.fn(async () => json(200, { ok: true, id: ID, createdAt: 1000, expiresAt: 2000 }));
    const outcome = await createShareLink(options(fetchImpl));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/share");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer id-token");
    const sent = JSON.parse(init.body as string);
    expect(Object.keys(sent).sort()).toEqual(["ct", "hours", "iv"]);
    expect(sent.hours).toBe(168);

    // The key is the part after #, so it is not in what was sent, and neither is any of the summary.
    const key = parseShareKey(new URL(outcome.link).hash) as string;
    expect(key).toHaveLength(43);
    expect(init.body as string).not.toContain(key);
    expect(init.body as string).not.toMatch(/Ravi|sleep|secret/);
    expect(outcome.link).toBe(`https://recoverly.co.in/share/${ID}#${key}`);
  });

  it("makes a link that opens, with its own key, to exactly what was shared", async () => {
    let stored: { iv: string; ct: string } | null = null;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/share" && init?.method === "POST") {
        stored = JSON.parse(init.body as string);
        return json(200, { ok: true, id: ID, createdAt: 1000, expiresAt: 2000 });
      }
      return json(200, { ...stored, createdAt: 1000, expiresAt: 2000 });
    });
    const made = await createShareLink(options(fetchImpl as unknown as typeof fetch));
    if (!made.ok) throw new Error("setup");

    const link = new URL(made.link);
    const id = parseShareId(link.pathname.split("/").pop()) as string;
    const key = parseShareKey(link.hash) as string;
    const copy = await fetchSharedCopy(id, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(copy.ok).toBe(true);
    if (!copy.ok) return;
    expect(await openSnapshot({ key, iv: copy.iv, ct: copy.ct })).toEqual(snapshot());
    // Someone with the address but not the key gets nothing.
    expect(await openSnapshot({ key: "B".repeat(43), iv: copy.iv, ct: copy.ct })).toBeNull();
  });

  it("makes no request for a summary with nothing in it", async () => {
    const fetchImpl = vi.fn(async () => json(200, {}));
    const empty = buildSnapshot(FACTS, [], { now: new Date() });
    expect(await createShareLink({ ...options(fetchImpl), snapshot: empty })).toEqual({ ok: false, reason: "empty" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("makes no request, and says why, where the browser cannot scramble", async () => {
    vi.stubGlobal("crypto", undefined);
    const fetchImpl = vi.fn(async () => json(200, {}));
    expect(await createShareLink(options(fetchImpl))).toEqual({ ok: false, reason: "crypto" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("tells the failures apart", async () => {
    const reason = async (response: () => Promise<Response>) => {
      const outcome = await createShareLink(options(vi.fn(response)));
      return outcome.ok ? "ok" : outcome.reason;
    };
    expect(await reason(async () => json(409, { error: "limit" }))).toBe("limit");
    expect(await reason(async () => json(429))).toBe("busy");
    expect(await reason(async () => json(503, { error: "unavailable" }))).toBe("unavailable");
    expect(await reason(async () => json(401, { error: "unauthorized" }))).toBe("unavailable");
    expect(await reason(async () => json(200, { ok: true, id: "bad", createdAt: 1, expiresAt: 2 }))).toBe("unavailable");
    expect(await reason(async () => Promise.reject(new Error("offline")))).toBe("network");
  });
});

describe("listOwnShares, stopOwnShare and stopAllOwnShares", () => {
  it("lists only well-formed entries, and says null when it could not", async () => {
    const shares = [{ id: ID, createdAt: 1, expiresAt: 2 }, { id: "bad", createdAt: 1, expiresAt: 2 }, { id: ID, createdAt: "x", expiresAt: 2 }, null];
    expect(await listOwnShares("t", async () => json(200, { shares }))).toEqual([{ id: ID, createdAt: 1, expiresAt: 2 }]);
    expect(await listOwnShares("t", async () => json(503))).toBeNull();
    expect(await listOwnShares("t", async () => json(200, { shares: "no" }))).toBeNull();
    expect(await listOwnShares("t", async () => Promise.reject(new Error("offline")))).toBeNull();
  });

  it("stops one link by its address, and treats 'already gone' as stopped", async () => {
    const fetchImpl = vi.fn(async () => json(200, { ok: true }));
    expect(await stopOwnShare("t", ID, fetchImpl)).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/share?id=${ID}`);
    expect(init.method).toBe("DELETE");
    expect(await stopOwnShare("t", ID, async () => json(404))).toBe(true);
    expect(await stopOwnShare("t", ID, async () => json(500))).toBe(false);
    expect(await stopOwnShare("t", "nonsense", fetchImpl)).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("stops everything", async () => {
    const fetchImpl = vi.fn(async () => json(200, { ok: true, stopped: 2 }));
    expect(await stopAllOwnShares("t", fetchImpl)).toBe(true);
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe("/api/share?all=1");
    expect(await stopAllOwnShares("t", async () => json(500))).toBe(false);
  });
});

describe("fetchSharedCopy", () => {
  it("asks for the address alone, with no cookies, and no key", async () => {
    const fetchImpl = vi.fn(async () => json(200, { iv: "a", ct: "b", createdAt: 1, expiresAt: 2 }));
    await fetchSharedCopy(ID, { fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/share/${ID}`);
    expect(init.credentials).toBe("omit");
    expect(init.cache).toBe("no-store");
  });

  it("does not ask at all for something that is not an address", async () => {
    const fetchImpl = vi.fn(async () => json(200, {}));
    expect(await fetchSharedCopy("../x", { fetchImpl })).toEqual({ ok: false, reason: "gone" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("tells a link that is gone from a server that could not be reached", async () => {
    expect(await fetchSharedCopy(ID, { fetchImpl: async () => json(404, { error: "not-found" }) })).toEqual({ ok: false, reason: "gone" });
    expect(await fetchSharedCopy(ID, { fetchImpl: async () => json(429) })).toEqual({ ok: false, reason: "busy" });
    expect(await fetchSharedCopy(ID, { fetchImpl: async () => json(500) })).toEqual({ ok: false, reason: "failed" });
    expect(await fetchSharedCopy(ID, { fetchImpl: async () => json(200, { iv: 1 }) })).toEqual({ ok: false, reason: "failed" });
    expect(await fetchSharedCopy(ID, { fetchImpl: async () => Promise.reject(new Error("offline")) })).toEqual({ ok: false, reason: "failed" });
  });
});
