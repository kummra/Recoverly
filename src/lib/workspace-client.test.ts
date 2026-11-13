import { beforeAll, describe, expect, it, vi } from "vitest";

import type { ShareSnapshot } from "@/lib/share";
import { fetchInbox, fetchTeamKey, listOwnCopies, sendToTeam, stopAllOwnCopies, stopOwnCopy } from "@/lib/workspace-client";
import { generateWorkspaceKeys, keyIdOf, openFromWorkspace } from "@/lib/workspace-crypto";

const SNAPSHOT: ShareSnapshot = { v: 1, createdAt: "2026-11-12T09:30:00.000Z", label: "Asha K", why: "My daughter's wedding in March" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let pair: { publicJwk: JsonWebKey; privateJwk: JsonWebKey };
let keyId: string;
beforeAll(async () => {
  pair = await generateWorkspaceKeys();
  keyId = (await keyIdOf(pair.publicJwk)) as string;
});

describe("fetchTeamKey", () => {
  it("returns the team's public key once its fingerprint matches the key it came with", async () => {
    const fetchImpl = vi.fn(async () => json({ publicKey: pair.publicJwk, keyId }));
    const result = await fetchTeamKey("clinica26", "tok", fetchImpl as unknown as typeof fetch);
    expect(result).toMatchObject({ ok: true, team: { practice: false, keyId } });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/workspace?code=CLINICA26");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("does not trust a fingerprint that is not that of the key it was sent with", async () => {
    const other = (await generateWorkspaceKeys()).publicJwk;
    const result = await fetchTeamKey("CLINICA26", "tok", (async () => json({ publicKey: other, keyId })) as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  it("does not take a private key, a malformed answer or a bad fingerprint for a team's key", async () => {
    for (const body of [{ publicKey: pair.privateJwk, keyId }, { publicKey: pair.publicJwk, keyId: "nope" }, { publicKey: pair.publicJwk }, {}, []]) {
      expect(await fetchTeamKey("CLINICA26", "t", (async () => json(body)) as unknown as typeof fetch), JSON.stringify(Object.keys(body))).toEqual({ ok: false, reason: "unavailable" });
    }
  });

  it("knows the sample programme as practice, and tells the other answers apart", async () => {
    expect(await fetchTeamKey("SAMPLE", "t", (async () => json({ practice: true })) as unknown as typeof fetch)).toEqual({ ok: true, team: { practice: true } });
    expect(await fetchTeamKey("CLINICA26", "t", (async () => json({}, 404)) as unknown as typeof fetch)).toEqual({ ok: false, reason: "not-found" });
    expect(await fetchTeamKey("CLINICA26", "t", (async () => json({}, 429)) as unknown as typeof fetch)).toEqual({ ok: false, reason: "busy" });
    expect(await fetchTeamKey("CLINICA26", "t", (async () => json({}, 500)) as unknown as typeof fetch)).toEqual({ ok: false, reason: "unavailable" });
    expect(await fetchTeamKey("CLINICA26", "t", (async () => Promise.reject(new Error("offline"))) as unknown as typeof fetch)).toEqual({ ok: false, reason: "network" });
  });

  it("does not ask at all about something that is not a programme code", async () => {
    const fetchImpl = vi.fn();
    expect(await fetchTeamKey("no", "t", fetchImpl as unknown as typeof fetch)).toEqual({ ok: false, reason: "not-found" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("sendToTeam", () => {
  const ok = () => json({ ok: true, createdAt: 1, updatedAt: 2, expiresAt: 3, stored: true });

  it("scrambles for the team before anything is sent, so only the team's key can read what arrives", async () => {
    const fetchImpl = vi.fn(async () => ok());
    const outcome = await sendToTeam({ snapshot: SNAPSHOT, code: "clinica26", team: { practice: false, publicKey: pair.publicJwk, keyId }, token: "tok", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(outcome).toEqual({ ok: true, createdAt: 1, updatedAt: 2, expiresAt: 3, stored: true });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/workspace/copy");
    expect(init.method).toBe("PUT");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body).sort()).toEqual(["code", "ct", "iv", "keyId", "wk"]);
    expect(body.code).toBe("CLINICA26");
    expect(body.keyId).toBe(keyId);
    // Nothing the person wrote, and nothing about them, is in what was sent.
    expect(init.body).not.toMatch(/Asha|wedding|daughter|uid|email/i);
    // And the team's private key opens it.
    expect(await openFromWorkspace(pair.privateJwk, { iv: body.iv, ct: body.ct, wk: body.wk })).toEqual(SNAPSHOT);
  });

  it("runs a practice send for the sample the same way, with a key nobody holds, and says nothing was stored", async () => {
    const fetchImpl = vi.fn(async () => json({ ok: true, createdAt: 1, updatedAt: 2, expiresAt: 3, stored: false }));
    const outcome = await sendToTeam({ snapshot: SNAPSHOT, code: "SAMPLE", team: { practice: true }, token: "t", fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(outcome).toMatchObject({ ok: true, stored: false });
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(await openFromWorkspace(pair.privateJwk, { iv: body.iv, ct: body.ct, wk: body.wk })).toBeNull();
  });

  it("sends nothing when nothing was ticked", async () => {
    const fetchImpl = vi.fn();
    const empty: ShareSnapshot = { v: 1, createdAt: SNAPSHOT.createdAt, label: "Asha" };
    expect(await sendToTeam({ snapshot: empty, code: "CLINICA26", team: { practice: false, publicKey: pair.publicJwk, keyId }, token: "t", fetchImpl: fetchImpl as unknown as typeof fetch })).toEqual({ ok: false, reason: "empty" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("tells a changed team key from a limit, and every other failure apart", async () => {
    const team = { practice: false, publicKey: pair.publicJwk, keyId } as const;
    const send = (response: () => Promise<Response>) => sendToTeam({ snapshot: SNAPSHOT, code: "CLINICA26", team, token: "t", fetchImpl: response as unknown as typeof fetch });
    expect(await send(async () => json({ error: "key-changed" }, 409))).toEqual({ ok: false, reason: "key-changed" });
    expect(await send(async () => json({ error: "limit" }, 409))).toEqual({ ok: false, reason: "limit" });
    expect(await send(async () => json({}, 404))).toEqual({ ok: false, reason: "not-found" });
    expect(await send(async () => json({}, 429))).toEqual({ ok: false, reason: "busy" });
    expect(await send(async () => json({}, 503))).toEqual({ ok: false, reason: "unavailable" });
    expect(await send(async () => json({ ok: true }, 200))).toEqual({ ok: false, reason: "unavailable" });
    expect(await send(async () => Promise.reject(new Error("offline")))).toEqual({ ok: false, reason: "network" });
  });
});

describe("what the person shares, and stopping", () => {
  it("lists only well-formed copies", async () => {
    const good = { code: "CLINICA26", createdAt: 1, updatedAt: 2, expiresAt: 3, current: true };
    const list = await listOwnCopies("t", (async () => json({ copies: [good, { code: "no" }, null, { ...good, current: "yes" }] })) as unknown as typeof fetch);
    expect(list).toEqual([good]);
    expect(await listOwnCopies("t", (async () => json({}, 500)) as unknown as typeof fetch)).toBeNull();
    expect(await listOwnCopies("t", (async () => json({ nope: 1 })) as unknown as typeof fetch)).toBeNull();
    expect(await listOwnCopies("t", (async () => Promise.reject(new Error("offline"))) as unknown as typeof fetch)).toBeNull();
  });

  it("stops one team's copy, or all, and reports whether it worked", async () => {
    const fetchImpl = vi.fn(async () => json({ ok: true }));
    expect(await stopOwnCopy("t", "clinica26", fetchImpl as unknown as typeof fetch)).toBe(true);
    expect((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe("/api/workspace/copy?code=CLINICA26");
    expect((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe("DELETE");
    expect(await stopAllOwnCopies("t", fetchImpl as unknown as typeof fetch)).toBe(true);
    expect((fetchImpl.mock.calls[1] as unknown as [string])[0]).toBe("/api/workspace/copy?all=1");
    expect(await stopOwnCopy("t", "clinica26", (async () => json({}, 500)) as unknown as typeof fetch)).toBe(false);
    expect(await stopOwnCopy("t", "clinica26", (async () => Promise.reject(new Error("offline"))) as unknown as typeof fetch)).toBe(false);
    expect(await stopOwnCopy("t", "x", fetchImpl as unknown as typeof fetch)).toBe(false);
  });
});

describe("fetchInbox (the team's side)", () => {
  const copy = { id: "i".repeat(22), iv: "A".repeat(16), ct: "B".repeat(60), wk: "C".repeat(342), createdAt: 1, updatedAt: 2, expiresAt: 3 };

  it("proves it is the team with its private link in a header, never in the address, and without cookies", async () => {
    const fetchImpl = vi.fn(async () => json({ name: "Clinic A", keyId, copies: [copy, { id: 5 }] }));
    const result = await fetchInbox("the-private-report-link-key", fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, name: "Clinic A", keyId, copies: [copy] });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/workspace/inbox");
    expect(url).not.toContain("the-private-report-link-key");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer the-private-report-link-key");
    expect(init.credentials).toBe("omit");
  });

  it("tells each failure apart and treats a team with no key yet as one with no fingerprint", async () => {
    expect(await fetchInbox("k", (async () => json({}, 404)) as unknown as typeof fetch)).toEqual({ ok: false, reason: "not-found" });
    expect(await fetchInbox("k", (async () => json({}, 429)) as unknown as typeof fetch)).toEqual({ ok: false, reason: "busy" });
    expect(await fetchInbox("k", (async () => json({}, 500)) as unknown as typeof fetch)).toEqual({ ok: false, reason: "failed" });
    expect(await fetchInbox("k", (async () => json({ nope: 1 })) as unknown as typeof fetch)).toEqual({ ok: false, reason: "failed" });
    expect(await fetchInbox("k", (async () => Promise.reject(new Error("offline"))) as unknown as typeof fetch)).toEqual({ ok: false, reason: "failed" });
    expect(await fetchInbox("k", (async () => json({ name: "Clinic A", keyId: null, copies: [] })) as unknown as typeof fetch)).toEqual({ ok: true, name: "Clinic A", keyId: null, copies: [] });
  });
});
