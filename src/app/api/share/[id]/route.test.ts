import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShareRecord, ShareStore } from "@/lib/share-service";

const env = vi.hoisted(() => ({ configured: true, records: new Map<string, unknown>() }));

vi.mock("@/lib/firebase-admin", () => ({
  get adminDb() {
    return env.configured ? {} : null;
  },
  get isAdminConfigured() {
    return env.configured;
  }
}));
vi.mock("@/lib/share-firestore", () => ({
  firestoreShareStore: (): ShareStore => {
    const records = env.records as Map<string, ShareRecord>;
    return {
      create: async () => true,
      get: async (id) => records.get(id) ?? null,
      listByOwner: async () => [],
      delete: async (id) => void records.delete(id),
      deleteByOwner: async () => 0,
      deleteExpired: async () => 0
    };
  }
}));

import { GET } from "@/app/api/share/[id]/route";

const ID = "Q".repeat(22);
const iv = "A".repeat(16);
const ct = "B".repeat(300);

let counter = 0;
/** A distinct caller each time, so the in-memory rate limit does not carry over. */
function open(id: string, headers: Record<string, string> = {}) {
  counter += 1;
  return GET(new NextRequest(`https://recoverly.co.in/api/share/${id}`, { headers: { "x-forwarded-for": `198.51.100.${counter}`, ...headers } }), {
    params: Promise.resolve({ id })
  });
}

beforeEach(() => {
  env.configured = true;
  env.records.clear();
});

describe("GET /api/share/:id", () => {
  it("hands anyone with the address the scrambled copy, and nothing about its maker", async () => {
    env.records.set(ID, { id: ID, uid: "uid-secret", iv, ct, createdAt: Date.now() - 1000, expiresAt: Date.now() + 3_600_000 });
    const res = await open(ID);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ iv, ct });
    expect(text).not.toContain("uid-secret");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("needs no sign-in: the person opening it is a doctor, not a user", async () => {
    env.records.set(ID, { id: ID, uid: "u", iv, ct, createdAt: 1, expiresAt: Date.now() + 3_600_000 });
    expect((await open(ID)).status).toBe(200);
  });

  it("answers the same way for an address that never existed and one that ended", async () => {
    env.records.set(ID, { id: ID, uid: "u", iv, ct, createdAt: 1, expiresAt: Date.now() - 1 });
    const ended = await open(ID);
    const never = await open("Z".repeat(22));
    expect(ended.status).toBe(404);
    expect(never.status).toBe(404);
    expect(await ended.json()).toEqual(await never.json());
    // ...and the ended one is gone.
    expect(env.records.size).toBe(0);
  });

  it("answers 404, not 500, for a malformed address", async () => {
    for (const bad of ["x", "..", "%00", "a".repeat(200)]) expect((await open(bad)).status, bad).toBe(404);
  });

  it("says so when the server is not set up", async () => {
    env.configured = false;
    expect((await open(ID)).status).toBe(503);
  });

  it("holds one address to its limit", async () => {
    env.records.set(ID, { id: ID, uid: "u", iv, ct, createdAt: 1, expiresAt: Date.now() + 3_600_000 });
    let status = 200;
    for (let i = 0; i < 121; i++) {
      status = (await GET(new NextRequest(`https://recoverly.co.in/api/share/${ID}`, { headers: { "x-forwarded-for": "192.0.2.77" } }), { params: Promise.resolve({ id: ID }) })).status;
    }
    expect(status).toBe(429);
  });
});
