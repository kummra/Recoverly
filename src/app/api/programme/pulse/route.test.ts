import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Programme } from "@/lib/programme";

const env = vi.hoisted(() => ({ configured: true, uid: "uid-1" as string | null, added: [] as Array<[string, string, number]>, programmes: new Map<string, unknown>() }));

vi.mock("@/lib/firebase-admin", () => ({
  get adminDb() {
    return env.configured ? {} : null;
  },
  get isAdminConfigured() {
    return env.configured;
  }
}));
vi.mock("@/lib/server-auth", () => ({ getUserIdFromRequest: async () => env.uid }));
vi.mock("@/lib/programme-pulse-firestore", () => ({
  firestorePulseStore: () => ({
    async add(code: string, month: string, answer: number) {
      env.added.push([code, month, answer]);
    },
    async read() {
      return {};
    }
  })
}));
vi.mock("@/lib/org/server", () => ({ directory: { findProgramme: async (code: unknown) => (typeof code === "string" ? ((env.programmes.get(code.toUpperCase()) as Programme | undefined) ?? null) : null) } }));

import { POST } from "@/app/api/programme/pulse/route";

const offers: Programme = { code: "ACMELOGI26", name: "Acme", kind: "workplace", welcome: { en: "Welcome to the Acme programme." }, contacts: [], headcount: true, pulse: true };
let n = 0;
const ask = (body: unknown, raw?: string) => new NextRequest("https://recoverly.co.in/api/programme/pulse", { method: "POST", headers: { authorization: "Bearer t", "content-type": "application/json" }, body: raw ?? JSON.stringify(body) });

beforeEach(() => {
  n += 1;
  env.configured = true;
  env.uid = `uid-${n}`;
  env.added = [];
  env.programmes = new Map([["ACMELOGI26", offers], ["NOPULSE222", { ...offers, code: "NOPULSE222", pulse: false }]]);
});

describe("POST /api/programme/pulse", () => {
  it("adds one anonymous answer for a programme that offers the survey, and nothing about who sent it", async () => {
    const response = await POST(ask({ code: "acmelogi26", answer: 4 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(env.added).toHaveLength(1);
    expect(env.added[0][0]).toBe("ACMELOGI26");
    expect(env.added[0][2]).toBe(4);
    expect(JSON.stringify(env.added)).not.toContain(env.uid ?? "never");
  });

  it("needs a sign-in, and is unavailable without a database", async () => {
    env.uid = null;
    expect((await POST(ask({ code: "ACMELOGI26", answer: 4 }))).status).toBe(401);
    env.uid = "uid-x";
    env.configured = false;
    expect((await POST(ask({ code: "ACMELOGI26", answer: 4 }))).status).toBe(503);
    expect(env.added).toEqual([]);
  });

  it("answers 'not found' the same way for a programme with no survey and one that does not exist, and refuses a bad answer", async () => {
    const none = await POST(ask({ code: "NOPULSE222", answer: 3 }));
    const missing = await POST(ask({ code: "NOSUCH2222", answer: 3 }));
    expect(none.status).toBe(404);
    expect(await none.json()).toEqual(await missing.json());
    expect((await POST(ask({ code: "ACMELOGI26", answer: 9 }))).status).toBe(400);
    expect((await POST(ask({ code: "ACMELOGI26" }))).status).toBe(400);
    expect(env.added).toEqual([]);
  });

  it("refuses a body that is too large, not JSON, or not an object", async () => {
    expect((await POST(ask(null, "x".repeat(400)))).status).toBe(413);
    expect((await POST(ask(null, "{not json"))).status).toBe(400);
    expect((await POST(ask(null, "[1]"))).status).toBe(400);
    expect(env.added).toEqual([]);
  });

  it("slows down someone who keeps sending", async () => {
    env.uid = "uid-flood";
    let last = 200;
    for (let i = 0; i < 14; i++) last = (await POST(ask({ code: "ACMELOGI26", answer: 3 }))).status;
    expect(last).toBe(429);
  });
});
