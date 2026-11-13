import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Programme } from "@/lib/programme";
import type { CountStore } from "@/lib/programme-count-service";

const env = vi.hoisted(() => ({
  configured: true,
  uid: "uid-1" as string | null,
  increments: [] as Array<[string, string]>,
  programmes: new Map<string, unknown>()
}));

vi.mock("@/lib/firebase-admin", () => ({
  get adminDb() {
    return env.configured ? {} : null;
  },
  get isAdminConfigured() {
    return env.configured;
  }
}));
vi.mock("@/lib/server-auth", () => ({ getUserIdFromRequest: async () => env.uid }));
vi.mock("@/lib/programme-count-firestore", () => ({
  firestoreCountStore: (): CountStore => ({
    async increment(code, month) {
      env.increments.push([code, month]);
    },
    async read() {
      return {};
    },
    async addFigures(code, month) {
      env.increments.push([`figures:${code}`, month]);
    },
    async readFigures() {
      return {};
    }
  })
}));
vi.mock("@/lib/programme-register", () => ({
  findProgramme: (code: unknown) => (typeof code === "string" ? (env.programmes.get(code.toUpperCase()) as Programme | undefined) ?? null : null)
}));

import { POST } from "@/app/api/programme/count/route";

const offers = { code: "ACMELOGI26", name: "Acme", kind: "workplace", welcome: { en: "Welcome, everyone." }, contacts: [], headcount: true };
const silent = { ...offers, code: "QUIETORG26", headcount: undefined };
const sample = { ...offers, code: "SAMPLE", kind: "sample" };

let user = 0;
function tick(body: unknown) {
  return POST(
    new NextRequest("https://recoverly.co.in/api/programme/count", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer t" },
      body: typeof body === "string" ? body : JSON.stringify(body)
    })
  );
}

beforeEach(() => {
  env.configured = true;
  env.increments.length = 0;
  env.programmes = new Map<string, unknown>([
    ["ACMELOGI26", offers],
    ["QUIETORG26", silent],
    ["SAMPLE", sample]
  ]);
  user += 1;
  env.uid = `uid-${user}`;
});

describe("POST /api/programme/count", () => {
  it("adds one to the programme's total for this month and says which month", async () => {
    const res = await tick({ code: "ACMELOGI26" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Object.keys(data).sort()).toEqual(["month", "ok"]);
    expect(data.month).toMatch(/^\d{4}-\d{2}$/);
    expect(env.increments).toEqual([["ACMELOGI26", data.month]]);
  });

  it("stores the programme and the month and nothing that says who sent it", async () => {
    env.uid = "uid-secret-person";
    await tick({ code: "ACMELOGI26" });
    expect(JSON.stringify(env.increments)).not.toContain("uid-secret-person");
    expect(env.increments[0]).toHaveLength(2);
  });

  it("needs a signed-in person, so a script cannot fake a count", async () => {
    env.uid = null;
    expect((await tick({ code: "ACMELOGI26" })).status).toBe(401);
    expect(env.increments).toEqual([]);
  });

  it("does not count a programme that has not agreed to it, and answers as if it did not exist", async () => {
    const quiet = await tick({ code: "QUIETORG26" });
    const missing = await tick({ code: "NOSUCHCODE" });
    expect(quiet.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await quiet.json()).toEqual(await missing.json());
    expect(env.increments).toEqual([]);
  });

  it("accepts a tick for the sample programme and stores nothing", async () => {
    expect((await tick({ code: "SAMPLE" })).status).toBe(200);
    expect(env.increments).toEqual([]);
  });

  it("refuses what is not a tick", async () => {
    expect((await tick("{not json")).status).toBe(400);
    expect((await tick("null")).status).toBe(404);
    expect((await tick({})).status).toBe(404);
    expect((await tick({ code: 5 })).status).toBe(404);
    expect((await tick({ code: "A".repeat(900) })).status).toBe(413);
    expect(env.increments).toEqual([]);
  });

  it("says so when the server is not set up", async () => {
    env.configured = false;
    expect((await tick({ code: "ACMELOGI26" })).status).toBe(503);
  });

  it("holds one person to a dozen an hour", async () => {
    let last = 200;
    for (let i = 0; i < 13; i++) last = (await tick({ code: "ACMELOGI26" })).status;
    expect(last).toBe(429);
  });
});
