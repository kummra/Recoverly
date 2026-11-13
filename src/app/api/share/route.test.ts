import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShareRecord, ShareStore } from "@/lib/share-service";

const env = vi.hoisted(() => ({ configured: true, uid: "uid-1" as string | null, records: new Map<string, unknown>() }));

vi.mock("@/lib/firebase-admin", () => ({
  get adminDb() {
    return env.configured ? {} : null;
  },
  get isAdminConfigured() {
    return env.configured;
  }
}));
vi.mock("@/lib/server-auth", () => ({ getUserIdFromRequest: async () => env.uid }));
vi.mock("@/lib/share-firestore", () => ({
  firestoreShareStore: (): ShareStore => {
    const records = env.records as Map<string, ShareRecord>;
    return {
      async create(record) {
        if (records.has(record.id)) return false;
        records.set(record.id, record);
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
      async deleteExpired() {
        return 0;
      }
    };
  }
}));

import { DELETE, GET, POST } from "@/app/api/share/route";
import { SHARE_LIMITS } from "@/lib/share";

const iv = "A".repeat(16);
const ct = "B".repeat(300);

function call(method: "POST" | "GET" | "DELETE", url = "https://recoverly.co.in/api/share", body?: unknown) {
  const request = new NextRequest(url, {
    method,
    headers: { "content-type": "application/json", authorization: "Bearer token" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)
  });
  return { POST, GET, DELETE }[method](request);
}

let user = 0;
beforeEach(() => {
  env.configured = true;
  env.records.clear();
  // A different person each time, so the in-memory rate limit does not carry over.
  user += 1;
  env.uid = `uid-${user}`;
});

describe("POST /api/share", () => {
  it("makes a link and says only its address and its dates", async () => {
    const res = await call("POST", undefined, { iv, ct, hours: 168 });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Object.keys(data).sort()).toEqual(["createdAt", "expiresAt", "id", "ok"]);
    expect(data.expiresAt - data.createdAt).toBe(168 * 3_600_000);
    expect(env.records.size).toBe(1);
  });

  it("needs a signed-in person", async () => {
    env.uid = null;
    expect((await call("POST", undefined, { iv, ct, hours: 168 })).status).toBe(401);
    expect(env.records.size).toBe(0);
  });

  it("says so, rather than failing mysteriously, when the server is not set up", async () => {
    env.configured = false;
    const res = await call("POST", undefined, { iv, ct, hours: 168 });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "unavailable" });
  });

  it("refuses a body that is not a summary-sized, well-formed request", async () => {
    expect((await call("POST", undefined, "{not json")).status).toBe(400);
    expect((await call("POST", undefined, "null")).status).toBe(400);
    expect((await call("POST", undefined, { iv, ct, hours: 5 })).status).toBe(400);
    expect((await call("POST", undefined, { iv: "x", ct, hours: 168 })).status).toBe(400);
    expect((await call("POST", undefined, { iv, ct: "A".repeat(SHARE_LIMITS.ciphertextMaxChars + 5000), hours: 168 })).status).toBe(413);
    expect(env.records.size).toBe(0);
  });

  it("allows five at a time", async () => {
    for (let i = 0; i < SHARE_LIMITS.activeMax; i++) expect((await call("POST", undefined, { iv, ct, hours: 24 })).status).toBe(200);
    const sixth = await call("POST", undefined, { iv, ct, hours: 24 });
    expect(sixth.status).toBe(409);
    expect(await sixth.json()).toEqual({ error: "limit" });
  });

  it("holds one person to ten attempts an hour", async () => {
    let last = 200;
    for (let i = 0; i < 11; i++) last = (await call("POST", undefined, { iv, ct, hours: 24 })).status;
    // Five links, then the limit of five, then the rate limit.
    expect(last).toBe(429);
  });
});

describe("GET /api/share", () => {
  it("lists the caller's own links and nobody else's", async () => {
    await call("POST", undefined, { iv, ct, hours: 24 });
    const mine = env.uid;
    env.uid = `${mine}-other`;
    await call("POST", undefined, { iv, ct, hours: 24 });
    env.uid = mine;
    const res = await call("GET");
    const { shares } = await res.json();
    expect(shares).toHaveLength(1);
    expect(Object.keys(shares[0]).sort()).toEqual(["createdAt", "expiresAt", "id"]);
  });

  it("needs a signed-in person", async () => {
    env.uid = null;
    expect((await call("GET")).status).toBe(401);
  });
});

describe("DELETE /api/share", () => {
  it("stops one link, only for its maker", async () => {
    const made = await (await call("POST", undefined, { iv, ct, hours: 24 })).json();
    const mine = env.uid;
    env.uid = `${mine}-other`;
    expect((await call("DELETE", `https://recoverly.co.in/api/share?id=${made.id}`)).status).toBe(404);
    expect(env.records.size).toBe(1);
    env.uid = mine;
    expect((await call("DELETE", `https://recoverly.co.in/api/share?id=${made.id}`)).status).toBe(200);
    expect(env.records.size).toBe(0);
  });

  it("stops all of them at once", async () => {
    for (let i = 0; i < 3; i++) await call("POST", undefined, { iv, ct, hours: 24 });
    const res = await call("DELETE", "https://recoverly.co.in/api/share?all=1");
    expect(await res.json()).toEqual({ ok: true, stopped: 3 });
    expect(env.records.size).toBe(0);
  });

  it("does nothing without a recognisable address", async () => {
    await call("POST", undefined, { iv, ct, hours: 24 });
    expect((await call("DELETE", "https://recoverly.co.in/api/share")).status).toBe(404);
    expect((await call("DELETE", "https://recoverly.co.in/api/share?id=..%2F..")).status).toBe(404);
    expect(env.records.size).toBe(1);
  });

  it("needs a signed-in person", async () => {
    env.uid = null;
    expect((await call("DELETE", "https://recoverly.co.in/api/share?all=1")).status).toBe(401);
  });
});
