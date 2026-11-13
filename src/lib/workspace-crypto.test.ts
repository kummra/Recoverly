import { beforeAll, describe, expect, it } from "vitest";

import { type ShareSnapshot } from "@/lib/share";
import { isWorkspaceCiphertext, isWorkspaceIv, isWrappedKey, publicKeyText } from "@/lib/workspace";
import {
  generateWorkspaceKeys,
  keyIdOf,
  openFromWorkspace,
  protectPrivateKey,
  publicKeyOf,
  sealForWorkspace,
  unlockPrivateKey,
  workspaceCryptoAvailable
} from "@/lib/workspace-crypto";
import { workspaceKeyId } from "@/lib/programme-register";

const SNAPSHOT: ShareSnapshot = {
  v: 1,
  createdAt: "2026-11-12T09:30:00.000Z",
  label: "Asha K",
  progress: {
    since: "2026-01-04",
    checkIns: 41,
    monthMl: 300,
    previousMonthMl: 900,
    dailyAverageMl: 20,
    currentStreakDays: 6,
    longestStreakDays: 14,
    freeDaysThisMonth: 9,
    daysThisMonth: 13,
    weeklyGoalMl: 350
  },
  why: "My daughter's wedding in March"
};

let team: { publicJwk: JsonWebKey; privateJwk: JsonWebKey };
let other: { publicJwk: JsonWebKey; privateJwk: JsonWebKey };
beforeAll(async () => {
  team = await generateWorkspaceKeys();
  other = await generateWorkspaceKeys();
});

describe("sealing a summary for a team", () => {
  it("is available in the test browser", () => {
    expect(workspaceCryptoAvailable()).toBe(true);
  });

  it("can be opened by the team's private key and gives back exactly the summary", async () => {
    const sealed = await sealForWorkspace(SNAPSHOT, team.publicJwk);
    const opened = await openFromWorkspace(team.privateJwk, sealed);
    expect(opened).toEqual(SNAPSHOT);
  });

  it("makes exactly what the server checks for: a 12-byte nonce, ciphertext, a 256-byte wrapped key", async () => {
    const sealed = await sealForWorkspace(SNAPSHOT, team.publicJwk);
    expect(isWorkspaceIv(sealed.iv)).toBe(true);
    expect(isWorkspaceCiphertext(sealed.ct)).toBe(true);
    expect(isWrappedKey(sealed.wk)).toBe(true);
  });

  it("leaves nothing readable in what the server stores", async () => {
    const sealed = JSON.stringify(await sealForWorkspace(SNAPSHOT, team.publicJwk));
    for (const secret of ["Asha", "wedding", "daughter", "2026-01-04", "300"]) expect(sealed).not.toContain(secret);
  });

  it("is different every time, so two copies of the same summary cannot be told apart", async () => {
    const a = await sealForWorkspace(SNAPSHOT, team.publicJwk);
    const b = await sealForWorkspace(SNAPSHOT, team.publicJwk);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
    expect(a.wk).not.toBe(b.wk);
  });

  it("cannot be opened with any other key", async () => {
    const sealed = await sealForWorkspace(SNAPSHOT, team.publicJwk);
    expect(await openFromWorkspace(other.privateJwk, sealed)).toBeNull();
  });

  it("is refused, not read wrongly, when any part was changed", async () => {
    const sealed = await sealForWorkspace(SNAPSHOT, team.publicJwk);
    const flip = (text: string) => `${text[0] === "A" ? "B" : "A"}${text.slice(1)}`;
    expect(await openFromWorkspace(team.privateJwk, { ...sealed, ct: flip(sealed.ct) })).toBeNull();
    expect(await openFromWorkspace(team.privateJwk, { ...sealed, wk: flip(sealed.wk) })).toBeNull();
    expect(await openFromWorkspace(team.privateJwk, { ...sealed, iv: flip(sealed.iv) })).toBeNull();
    expect(await openFromWorkspace(team.privateJwk, { iv: "", ct: "", wk: "" })).toBeNull();
    expect(await openFromWorkspace(team.privateJwk, { iv: sealed.iv, ct: sealed.ct, wk: "!!!" })).toBeNull();
  });

  it("will not seal for anything that is not a public key, and above all not for a private key", async () => {
    await expect(sealForWorkspace(SNAPSHOT, team.privateJwk)).rejects.toThrow();
    await expect(sealForWorkspace(SNAPSHOT, null)).rejects.toThrow();
    await expect(sealForWorkspace(SNAPSHOT, { kty: "RSA", n: "x", e: "AQAB" })).rejects.toThrow();
  });

  it("re-cleans what it opens, so a copy made by someone else cannot add anything to the page", async () => {
    const hostile = { ...SNAPSHOT, label: "<img src=x onerror=alert(1)>".repeat(10), injected: "<script>x</script>" } as unknown as ShareSnapshot;
    const opened = await openFromWorkspace(team.privateJwk, await sealForWorkspace(hostile, team.publicJwk));
    expect(opened).not.toBeNull();
    expect(JSON.stringify(opened)).not.toContain("injected");
    expect((opened?.label ?? "").length).toBeLessThanOrEqual(40);
  });
});

describe("locking the team's private key with a passphrase", () => {
  // Few iterations only to keep the test quick; the real number is a separate, pinned constant.
  it("unlocks with the right passphrase and gives back the same key", async () => {
    const blob = await protectPrivateKey(team.privateJwk, "a long passphrase 123", 1000);
    const back = await unlockPrivateKey(blob, "a long passphrase 123");
    expect(back).not.toBeNull();
    const sealed = await sealForWorkspace(SNAPSHOT, team.publicJwk);
    expect(await openFromWorkspace(back as JsonWebKey, sealed)).toEqual(SNAPSHOT);
  });

  it("does not unlock with a wrong passphrase, a changed file, or something that is not a key file", async () => {
    const blob = await protectPrivateKey(team.privateJwk, "a long passphrase 123", 1000);
    expect(await unlockPrivateKey(blob, "a long passphrase 124")).toBeNull();
    expect(await unlockPrivateKey(blob, "")).toBeNull();
    expect(await unlockPrivateKey({ ...blob, ct: `${blob.ct[0] === "A" ? "B" : "A"}${blob.ct.slice(1)}` }, "a long passphrase 123")).toBeNull();
    expect(await unlockPrivateKey({ ...blob, iterations: 999_999_999 }, "a long passphrase 123")).toBeNull();
    for (const bad of [null, undefined, "text", 5, {}, { v: 2 }, { ...blob, salt: "short" }]) expect(await unlockPrivateKey(bad, "a long passphrase 123")).toBeNull();
  });

  it("holds the key only in locked form: nothing of the private key can be read out of the file", async () => {
    const blob = await protectPrivateKey(team.privateJwk, "a long passphrase 123", 1000);
    const text = JSON.stringify(blob);
    for (const part of ["d", "p", "q", "dp", "dq", "qi"]) {
      const value = (team.privateJwk as Record<string, string>)[part];
      expect(text, part).not.toContain(value.slice(0, 40));
    }
  });

  it("refuses a passphrase that is too short to protect anything", async () => {
    await expect(protectPrivateKey(team.privateJwk, "short one", 1000)).rejects.toThrow();
  });
});

describe("a key's fingerprint", () => {
  it("is the same in the browser and on the server, so a person and a team can compare it", async () => {
    const browser = await keyIdOf(team.publicJwk);
    expect(browser).toMatch(/^[0-9a-f]{20}$/);
    expect(workspaceKeyId(team.publicJwk)).toBe(browser);
  });

  it("is the same for the public half of the private key, and different for a different key", async () => {
    expect(publicKeyOf(team.privateJwk)).toBe(publicKeyText(team.publicJwk));
    expect(await keyIdOf(team.publicJwk)).not.toBe(await keyIdOf(other.publicJwk));
    expect(await keyIdOf(team.privateJwk)).toBeNull();
  });
});
