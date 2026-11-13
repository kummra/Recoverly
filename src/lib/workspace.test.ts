import { beforeAll, describe, expect, it } from "vitest";

import { toBase64Url } from "@/lib/share";
import {
  WORKSPACE_EXPIRY_MS,
  WORKSPACE_KINDS,
  WORKSPACE_LIMITS,
  cleanPublicKey,
  formatKeyId,
  isKeyId,
  isWorkspaceCiphertext,
  isWorkspaceIv,
  isWrappedKey,
  publicKeyText,
  workspaceAllowedFor
} from "@/lib/workspace";
import { generateWorkspaceKeys } from "@/lib/workspace-crypto";

let pair: { publicJwk: JsonWebKey; privateJwk: JsonWebKey };
beforeAll(async () => {
  pair = await generateWorkspaceKeys();
});

describe("which organisations may have a workspace", () => {
  it("is only a clinic or a community service, never a workplace or a college, where a person cannot freely say no", () => {
    expect([...WORKSPACE_KINDS].sort()).toEqual(["clinic", "community"]);
    expect(workspaceAllowedFor("clinic")).toBe(true);
    expect(workspaceAllowedFor("community")).toBe(true);
    expect(workspaceAllowedFor("workplace")).toBe(false);
    expect(workspaceAllowedFor("college")).toBe(false);
    expect(workspaceAllowedFor("sample")).toBe(false);
  });

  it("keeps a copy for thirty days after it was last sent, which is what the policy says", () => {
    expect(WORKSPACE_LIMITS.expiryDays).toBe(30);
    expect(WORKSPACE_EXPIRY_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("the shapes of what is stored", () => {
  it("accepts a nonce of 12 bytes, ciphertext within the size limit, and a wrapped key of exactly 256 bytes", () => {
    expect(isWorkspaceIv("A".repeat(16))).toBe(true);
    expect(isWorkspaceIv("A".repeat(15))).toBe(false);
    expect(isWorkspaceIv("A".repeat(15) + "+")).toBe(false);
    expect(isWorkspaceCiphertext("B".repeat(22))).toBe(true);
    expect(isWorkspaceCiphertext("B".repeat(21))).toBe(false);
    expect(isWorkspaceCiphertext("B".repeat(WORKSPACE_LIMITS.ciphertextMaxChars))).toBe(true);
    expect(isWorkspaceCiphertext("B".repeat(WORKSPACE_LIMITS.ciphertextMaxChars + 1))).toBe(false);
    expect(isWorkspaceCiphertext(`${"B".repeat(30)}=`)).toBe(false);
    expect(isWrappedKey(toBase64Url(new Uint8Array(256).fill(9)))).toBe(true);
    expect(isWrappedKey(toBase64Url(new Uint8Array(255).fill(9)))).toBe(false);
    expect(isWrappedKey(toBase64Url(new Uint8Array(257).fill(9)))).toBe(false);
    for (const bad of [null, undefined, 5, {}, []]) {
      expect(isWorkspaceIv(bad)).toBe(false);
      expect(isWorkspaceCiphertext(bad)).toBe(false);
      expect(isWrappedKey(bad)).toBe(false);
      expect(isKeyId(bad)).toBe(false);
    }
  });

  it("takes a key fingerprint as exactly 20 lower-case hex characters and shows it in groups of four", () => {
    expect(isKeyId("0123456789abcdef0123")).toBe(true);
    expect(isKeyId("0123456789ABCDEF0123")).toBe(false);
    expect(isKeyId("0123456789abcdef012")).toBe(false);
    expect(isKeyId("0123456789abcdef01234")).toBe(false);
    expect(formatKeyId("0123456789abcdef0123")).toBe("0123 4567 89AB CDEF 0123");
  });
});

describe("cleanPublicKey", () => {
  it("accepts a real RSA public key and rebuilds it from its public fields only", () => {
    const clean = cleanPublicKey({ ...pair.publicJwk, extra: "ignored", key_ops: ["encrypt", "decrypt"] });
    expect(clean).toEqual({ kty: "RSA", alg: "RSA-OAEP-256", e: pair.publicJwk.e, n: pair.publicJwk.n, ext: true, key_ops: ["encrypt"] });
  });

  it("gives the same text however the key was ordered or padded with other fields, so equal keys compare equal", () => {
    const a = cleanPublicKey(pair.publicJwk);
    const b = cleanPublicKey({ n: pair.publicJwk.n, kid: "x", e: pair.publicJwk.e, kty: "RSA" });
    expect(publicKeyText(a as JsonWebKey)).toBe(publicKeyText(b as JsonWebKey));
  });

  it("refuses anything that carries any part of a private key, so a wrong paste cannot publish the one that opens everything", () => {
    for (const field of ["d", "p", "q", "dp", "dq", "qi", "oth", "k"]) {
      expect(cleanPublicKey({ ...pair.publicJwk, [field]: "AAAA" }), field).toBeNull();
    }
    expect(cleanPublicKey(pair.privateJwk)).toBeNull();
  });

  it("refuses what is not an RSA-OAEP-256 key of a sensible size", () => {
    const n = pair.publicJwk.n as string;
    const e = pair.publicJwk.e as string;
    expect(cleanPublicKey({ kty: "EC", n, e })).toBeNull();
    expect(cleanPublicKey({ kty: "RSA", alg: "RSA-OAEP", n, e })).toBeNull();
    expect(cleanPublicKey({ kty: "RSA", n: toBase64Url(new Uint8Array(128).fill(1)), e })).toBeNull(); // 1024 bits
    expect(cleanPublicKey({ kty: "RSA", n: toBase64Url(new Uint8Array(600).fill(1)), e })).toBeNull();
    expect(cleanPublicKey({ kty: "RSA", n: "not base64 !!", e })).toBeNull();
    expect(cleanPublicKey({ kty: "RSA", n, e: "AQAB=" })).toBeNull();
    expect(cleanPublicKey({ kty: "RSA", n, e: "A".repeat(9) })).toBeNull();
    for (const bad of [null, undefined, "key", 5, [], [pair.publicJwk]]) expect(cleanPublicKey(bad)).toBeNull();
  });
});
