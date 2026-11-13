import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { RegisterEntry } from "@/lib/programme-register";
import { toBase64Url } from "@/lib/share";
import type { WorkspaceCopy, WorkspaceStore } from "@/lib/workspace-service";

const env = vi.hoisted(() => ({ configured: true, uid: "uid-1" as string | null, copies: new Map<string, unknown>(), entries: [] as unknown[] }));

vi.mock("@/lib/firebase-admin", () => ({
  get adminDb() {
    return env.configured ? {} : null;
  },
  get isAdminConfigured() {
    return env.configured;
  }
}));
vi.mock("@/lib/server-auth", () => ({ getUserIdFromRequest: async () => env.uid }));
vi.mock("@/lib/workspace-firestore", () => ({
  firestoreWorkspaceStore: (): WorkspaceStore => {
    const copies = env.copies as Map<string, WorkspaceCopy>;
    return {
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
      async deleteExpired() {
        return 0;
      }
    };
  }
}));
// The register is swapped for one real clinic whose team key and report key are made below.
vi.mock("@/lib/programme-register", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/programme-register")>();
  const entries = () => env.entries as RegisterEntry[];
  return {
    ...real,
    PROGRAMMES: new Proxy([], { get: (_t, prop) => Reflect.get(entries(), prop) }),
    findWorkspaceTeam: (input: unknown) => {
      const code = typeof input === "string" ? input.toUpperCase() : "";
      const entry = entries().find((e) => e.code === code);
      const team = entry ? real.workspaceTeamFor(entry) : null;
      return team && (team.practice || team.publicKey) ? team : null;
    },
    findWorkspaceByReportKey: (token: unknown) => {
      const entry = real.matchReportKey(entries(), token);
      const team = entry ? real.workspaceTeamFor(entry) : null;
      return team && !team.practice ? team : null;
    }
  };
});

import { DELETE, GET as listCopies, PUT } from "@/app/api/workspace/copy/route";
import { GET as inbox } from "@/app/api/workspace/inbox/route";
import { GET as keyLookup } from "@/app/api/workspace/route";
import { hashReportKey, workspaceKeyId } from "@/lib/programme-register";
import { generateWorkspaceKeys } from "@/lib/workspace-crypto";

const TOKEN = "T".repeat(43);
const WK = toBase64Url(new Uint8Array(256).fill(5));
let teamKey: JsonWebKey;

beforeAll(async () => {
  teamKey = (await generateWorkspaceKeys()).publicJwk;
});
beforeEach(() => {
  env.configured = true;
  env.uid = "uid-1";
  env.copies.clear();
  env.entries = [
    { code: "SAMPLE", name: "Sample organisation", kind: "sample", welcome: { en: "Welcome to the sample." }, contacts: [] },
    { code: "CLINICA26", name: "Clinic A", kind: "clinic", welcome: { en: "Welcome to Clinic A." }, contacts: [], report: { keyHash: hashReportKey(TOKEN) }, workspace: { publicKey: teamKey } },
    { code: "NOKEY2626", name: "Clinic B", kind: "clinic", welcome: { en: "Welcome to Clinic B." }, contacts: [], report: { keyHash: hashReportKey("U".repeat(43)) }, workspace: {} },
    { code: "WORKPLACE26", name: "Acme", kind: "workplace", welcome: { en: "Welcome to Acme." }, contacts: [], report: { keyHash: hashReportKey("V".repeat(43)) }, workspace: { publicKey: teamKey } }
  ] satisfies RegisterEntry[];
});

const sealed = (over: Record<string, unknown> = {}) => ({ code: "CLINICA26", keyId: workspaceKeyId(teamKey), iv: "A".repeat(16), ct: "B".repeat(80), wk: WK, ...over });
const asPerson = (method: string, url: string, body?: unknown) =>
  new NextRequest(`https://recoverly.co.in${url}`, {
    method,
    headers: { "content-type": "application/json", authorization: "Bearer person" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
const asTeam = (token: string) => new NextRequest("https://recoverly.co.in/api/workspace/inbox", { headers: { authorization: `Bearer ${token}` } });

describe("GET /api/workspace (which key to scramble for)", () => {
  it("gives the team's public key and fingerprint from the register", async () => {
    const response = await keyLookup(asPerson("GET", "/api/workspace?code=clinica26"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.keyId).toBe(workspaceKeyId(teamKey));
    expect(body.publicKey.n).toBe(teamKey.n);
    expect(body.publicKey).not.toHaveProperty("d");
  });

  it("says 'practice' for the sample, and 'not found' for a programme with no key yet, one that may not have a workspace, or no such code", async () => {
    expect(await (await keyLookup(asPerson("GET", "/api/workspace?code=SAMPLE"))).json()).toEqual({ practice: true });
    for (const code of ["NOKEY2626", "WORKPLACE26", "NOSUCH2626", "", "x"]) expect((await keyLookup(asPerson("GET", `/api/workspace?code=${code}`))).status, code).toBe(404);
  });

  it("needs a sign-in", async () => {
    env.uid = null;
    expect((await keyLookup(asPerson("GET", "/api/workspace?code=CLINICA26"))).status).toBe(401);
  });
});

describe("/api/workspace/copy (a person's own copy)", () => {
  it("stores a scrambled copy and lists it back, with no contents and no account in the list", async () => {
    const put = await PUT(asPerson("PUT", "/api/workspace/copy", sealed()));
    expect(put.status).toBe(200);
    expect(await put.json()).toMatchObject({ ok: true, stored: true });
    const list = await (await listCopies(asPerson("GET", "/api/workspace/copy"))).json();
    expect(list.copies).toHaveLength(1);
    expect(list.copies[0]).toMatchObject({ code: "CLINICA26", current: true });
    expect(JSON.stringify(list)).not.toMatch(/uid-1|"ct"|"wk"/);
  });

  it("refuses a copy for a team that has no key, may not have a workspace, or does not exist, all the same way", async () => {
    for (const code of ["NOKEY2626", "WORKPLACE26", "NOSUCH2626"]) {
      expect((await PUT(asPerson("PUT", "/api/workspace/copy", sealed({ code })))).status, code).toBe(404);
    }
    expect(env.copies.size).toBe(0);
  });

  it("asks the device to start again when the key it used is not the team's current one", async () => {
    const response = await PUT(asPerson("PUT", "/api/workspace/copy", sealed({ keyId: "0".repeat(20) })));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "key-changed" });
  });

  it("accepts a practice send for the sample and stores nothing", async () => {
    const response = await PUT(asPerson("PUT", "/api/workspace/copy", sealed({ code: "SAMPLE", keyId: "0".repeat(20) })));
    expect(await response.json()).toMatchObject({ ok: true, stored: false });
    expect(env.copies.size).toBe(0);
  });

  it("refuses bad bodies, oversized ones and unsigned ones", async () => {
    expect((await PUT(asPerson("PUT", "/api/workspace/copy", "not json" as unknown))).status).toBe(400);
    expect((await PUT(asPerson("PUT", "/api/workspace/copy", [1, 2]))).status).toBe(400);
    expect((await PUT(asPerson("PUT", "/api/workspace/copy", sealed({ ct: "B".repeat(30_000) })))).status).toBe(413);
    env.uid = null;
    expect((await PUT(asPerson("PUT", "/api/workspace/copy", sealed()))).status).toBe(401);
    expect((await listCopies(asPerson("GET", "/api/workspace/copy"))).status).toBe(401);
    expect((await DELETE(asPerson("DELETE", "/api/workspace/copy?all=1"))).status).toBe(401);
  });

  it("stops sharing with one team, or with all, and only ever for the signed-in person", async () => {
    await PUT(asPerson("PUT", "/api/workspace/copy", sealed()));
    env.uid = "uid-2";
    await PUT(asPerson("PUT", "/api/workspace/copy", sealed()));
    expect(env.copies.size).toBe(2);
    expect(await (await DELETE(asPerson("DELETE", "/api/workspace/copy?code=clinica26"))).json()).toEqual({ ok: true, stopped: 1 });
    expect([...(env.copies as Map<string, WorkspaceCopy>).values()].map((c) => c.uid)).toEqual(["uid-1"]);
    env.uid = "uid-1";
    expect(await (await DELETE(asPerson("DELETE", "/api/workspace/copy?all=1"))).json()).toEqual({ ok: true, stopped: 1 });
    expect(env.copies.size).toBe(0);
    expect((await DELETE(asPerson("DELETE", "/api/workspace/copy"))).status).toBe(400);
  });

  it("is unavailable, not broken, when the database is not configured", async () => {
    env.configured = false;
    expect((await PUT(asPerson("PUT", "/api/workspace/copy", sealed()))).status).toBe(503);
  });
});

describe("GET /api/workspace/inbox (what the team receives)", () => {
  it("hands the team's own scrambled copies to the holder of its private link and nobody else", async () => {
    await PUT(asPerson("PUT", "/api/workspace/copy", sealed()));
    const response = await inbox(asTeam(TOKEN));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.name).toBe("Clinic A");
    expect(body.keyId).toBe(workspaceKeyId(teamKey));
    expect(body.copies).toHaveLength(1);
    expect(body.copies[0].wk).toBe(WK);
    expect(JSON.stringify(body)).not.toMatch(/uid-1|CLINICA26/);
  });

  it("says 'not found' to a wrong link, a missing one, the report link of an organisation with no workspace, or one that may not have a workspace", async () => {
    for (const token of ["W".repeat(43), "", "short", "U".repeat(43) + "x"]) expect((await inbox(asTeam(token))).status, token).toBe(404);
    // A workplace has a report link but may not have a workspace; its link opens none.
    expect((await inbox(asTeam("V".repeat(43)))).status).toBe(404);
    expect((await inbox(new NextRequest("https://recoverly.co.in/api/workspace/inbox"))).status).toBe(404);
    // The link in the address, not the header, is not taken.
    expect((await inbox(new NextRequest(`https://recoverly.co.in/api/workspace/inbox?token=${TOKEN}`))).status).toBe(404);
  });

  it("opens for a team that has not yet sent its key, with nothing in it", async () => {
    const body = await (await inbox(asTeam("U".repeat(43)))).json();
    expect(body).toMatchObject({ name: "Clinic B", keyId: null, copies: [] });
  });
});
