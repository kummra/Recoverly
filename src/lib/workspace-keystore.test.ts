import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearProtectedKey,
  isProtectedKey,
  keyFilePublicKey,
  keyFileText,
  loadProtectedKey,
  loadStoredPublicKey,
  parseKeyFile,
  saveProtectedKey,
  saveStoredPublicKey,
  workspaceKeyStorageKey
} from "@/lib/workspace-keystore";
import { type ProtectedKey, generateWorkspaceKeys, protectPrivateKey, unlockPrivateKey } from "@/lib/workspace-crypto";

function fakeStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data };
}

let blob: ProtectedKey;
beforeEach(async () => {
  vi.stubGlobal("window", { localStorage: fakeStorage() });
  blob = await protectPrivateKey((await generateWorkspaceKeys()).privateJwk, "a long passphrase 123", 1000);
});
afterEach(() => vi.unstubAllGlobals());

describe("the team's locked key in this browser", () => {
  it("is kept per programme, and read back as the same locked key", () => {
    expect(saveProtectedKey("clinica26", blob)).toBe(true);
    expect(loadProtectedKey("CLINICA26")).toEqual(blob);
    expect(loadProtectedKey("CLINICB26")).toBeNull();
    expect(workspaceKeyStorageKey("CLINICA26")).toBe("recoverly:workspace-key:CLINICA26");
  });

  it("is forgotten on request, and says so when the browser refuses to store it", () => {
    saveProtectedKey("CLINICA26", blob);
    clearProtectedKey("CLINICA26");
    expect(loadProtectedKey("CLINICA26")).toBeNull();
    vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => undefined } });
    expect(saveProtectedKey("CLINICA26", blob)).toBe(false);
  });

  it("ignores anything in storage that is not a locked key, rather than trusting it", () => {
    const storage = (window as unknown as { localStorage: ReturnType<typeof fakeStorage> }).localStorage;
    for (const junk of ["not json", "null", "[]", JSON.stringify({ v: 2 }), JSON.stringify({ ...blob, ct: "" }), JSON.stringify({ ...blob, kdf: "plain" })]) {
      storage.setItem(workspaceKeyStorageKey("CLINICA26"), junk);
      expect(loadProtectedKey("CLINICA26"), junk).toBeNull();
    }
    expect(isProtectedKey(blob)).toBe(true);
  });

  it("never holds anything but the locked form", () => {
    saveProtectedKey("CLINICA26", blob);
    const stored = (window as unknown as { localStorage: ReturnType<typeof fakeStorage> }).localStorage.data.get(workspaceKeyStorageKey("CLINICA26")) as string;
    expect(Object.keys(JSON.parse(stored)).sort()).toEqual(["ct", "iterations", "iv", "kdf", "salt", "v"]);
  });
});

describe("the key file a team can save", () => {
  it("reads back as the locked key and still opens with the passphrase", async () => {
    const text = keyFileText("CLINICA26", blob);
    expect(text).toContain("CLINICA26");
    const back = parseKeyFile(text);
    expect(back).toEqual(blob);
    expect(await unlockPrivateKey(back, "a long passphrase 123")).not.toBeNull();
  });

  it("refuses a file that is not one, however it is damaged", () => {
    for (const bad of ["", "not json", "[]", "null", "{}", JSON.stringify({ ...blob, v: 9 }), "x".repeat(30_000)]) expect(parseKeyFile(bad), bad.slice(0, 12)).toBeNull();
  });
});

describe("the team's public key kept beside its locked key", () => {
  it("is stored, read back cleaned, and forgotten together with the locked key when starting over", async () => {
    const { publicJwk } = await generateWorkspaceKeys();
    expect(saveStoredPublicKey("clinica26", publicJwk)).toBe(true);
    expect(loadStoredPublicKey("CLINICA26")?.n).toBe(publicJwk.n);
    saveProtectedKey("CLINICA26", blob);
    clearProtectedKey("CLINICA26");
    expect(loadStoredPublicKey("CLINICA26")).toBeNull();
    expect(loadProtectedKey("CLINICA26")).toBeNull();
  });

  it("refuses to store anything with a private part, which is not a public key", async () => {
    const { privateJwk } = await generateWorkspaceKeys();
    expect(saveStoredPublicKey("CLINICA26", privateJwk)).toBe(false);
    expect(loadStoredPublicKey("CLINICA26")).toBeNull();
  });

  it("travels in the key file, so another browser can show it, and a file without one gives none", async () => {
    const { publicJwk } = await generateWorkspaceKeys();
    const text = keyFileText("CLINICA26", blob, publicJwk);
    expect(keyFilePublicKey(text)?.n).toBe(publicJwk.n);
    expect(parseKeyFile(text)).toEqual(blob);
    expect(keyFilePublicKey(keyFileText("CLINICA26", blob))).toBeNull();
    expect(keyFilePublicKey("not json")).toBeNull();
  });
});
