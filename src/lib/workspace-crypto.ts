/**
 * Encryption for the team workspace (`workspace.ts`), all through the browser's own Web Crypto.
 *
 * Two layers, the standard way to encrypt something to a recipient's public key:
 *  - the summary is encrypted with a fresh AES-256-GCM key and nonce, as a summary link is;
 *  - that AES key is then wrapped with the team's RSA-OAEP (2048-bit, SHA-256) public key.
 * Only the holder of the matching private key can unwrap the AES key and so read the summary,
 * and that key is made in the team's browser and never sent anywhere. GCM authenticates, so
 * a copy that was changed fails to open instead of showing something wrong.
 *
 * The team's private key is kept in its browser locked with a passphrase (PBKDF2-SHA-256
 * with a high iteration count into AES-GCM), so a copied file or a stolen laptop gives
 * nothing without the passphrase. A forgotten passphrase cannot be recovered by anyone,
 * Recoverly included, and the screen says so.
 */
import { type ShareSnapshot, fromBase64Url, sanitiseSnapshot, toBase64Url } from "@/lib/share";
import { WORKSPACE_LIMITS, cleanPublicKey, publicKeyText } from "@/lib/workspace";

const RSA = { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" } as const;
const RSA_IMPORT = { name: "RSA-OAEP", hash: "SHA-256" } as const;
/** High on purpose: the team unlocks once a session, and the file is the thing an attacker would copy. */
export const PASSPHRASE_ITERATIONS = 600_000;
export const MIN_PASSPHRASE_LENGTH = 12;

function subtle(): SubtleCrypto | null {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return c && c.subtle && typeof c.getRandomValues === "function" ? c.subtle : null;
}

export function workspaceCryptoAvailable(): boolean {
  return subtle() !== null;
}

export type WorkspaceSealed = { iv: string; ct: string; wk: string };

export async function generateWorkspaceKeys(): Promise<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey }> {
  const api = subtle();
  if (!api) throw new Error("Web Crypto is not available");
  const pair = (await api.generateKey(RSA, true, ["encrypt", "decrypt"])) as CryptoKeyPair;
  return { publicJwk: await api.exportKey("jwk", pair.publicKey), privateJwk: await api.exportKey("jwk", pair.privateKey) };
}

/** Encrypt a summary so only the holder of the team's private key can read it. Throws if the key is not a usable public key. */
export async function sealForWorkspace(snapshot: ShareSnapshot, publicKey: unknown): Promise<WorkspaceSealed> {
  const api = subtle();
  if (!api) throw new Error("Web Crypto is not available");
  const jwk = cleanPublicKey(publicKey);
  if (!jwk) throw new Error("not a usable public key");

  const aes = await api.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await api.encrypt({ name: "AES-GCM", iv }, aes, new TextEncoder().encode(JSON.stringify(snapshot))));
  const recipient = await api.importKey("jwk", jwk, RSA_IMPORT, false, ["encrypt"]);
  const wrapped = new Uint8Array(await api.encrypt({ name: "RSA-OAEP" }, recipient, await api.exportKey("raw", aes)));
  return { iv: toBase64Url(iv), ct: toBase64Url(ciphertext), wk: toBase64Url(wrapped) };
}

/** Read a sealed summary with the team's private key. `null` for any failure: a different key, a changed copy, something that is not a summary. */
export async function openFromWorkspace(privateJwk: JsonWebKey, sealed: WorkspaceSealed): Promise<ShareSnapshot | null> {
  const api = subtle();
  if (!api) return null;
  try {
    const iv = fromBase64Url(sealed.iv);
    const ciphertext = fromBase64Url(sealed.ct);
    const wrapped = fromBase64Url(sealed.wk);
    if (!iv || iv.length !== 12 || !ciphertext || ciphertext.length < 16 || !wrapped) return null;
    const priv = await api.importKey("jwk", privateJwk, RSA_IMPORT, false, ["decrypt"]);
    const rawKey = await api.decrypt({ name: "RSA-OAEP" }, priv, wrapped);
    const aes = await api.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
    const plaintext = await api.decrypt({ name: "AES-GCM", iv }, aes, ciphertext);
    return sanitiseSnapshot(JSON.parse(new TextDecoder().decode(plaintext)));
  } catch {
    return null;
  }
}

/** A private key, locked with a passphrase, as plain data that can be kept in a browser or saved as a file. */
export type ProtectedKey = { v: 1; kdf: "PBKDF2-SHA256"; iterations: number; salt: string; iv: string; ct: string };

async function passphraseKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number, usage: KeyUsage): Promise<CryptoKey> {
  const api = subtle() as SubtleCrypto;
  const material = await api.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return api.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, [usage]);
}

export async function protectPrivateKey(privateJwk: JsonWebKey, passphrase: string, iterations: number = PASSPHRASE_ITERATIONS): Promise<ProtectedKey> {
  const api = subtle();
  if (!api) throw new Error("Web Crypto is not available");
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) throw new Error("passphrase too short");
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await passphraseKey(passphrase, salt, iterations, "encrypt");
  const ct = new Uint8Array(await api.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(privateJwk))));
  return { v: 1, kdf: "PBKDF2-SHA256", iterations, salt: toBase64Url(salt), iv: toBase64Url(iv), ct: toBase64Url(ct) };
}

/** The private key, or `null` for a wrong passphrase or anything that is not a protected key. Never throws. */
export async function unlockPrivateKey(blob: unknown, passphrase: string): Promise<JsonWebKey | null> {
  const api = subtle();
  if (!api || typeof blob !== "object" || blob === null) return null;
  const b = blob as Partial<ProtectedKey>;
  if (b.v !== 1 || b.kdf !== "PBKDF2-SHA256" || typeof b.iterations !== "number" || b.iterations < 1 || b.iterations > 5_000_000) return null;
  try {
    const salt = fromBase64Url(String(b.salt));
    const iv = fromBase64Url(String(b.iv));
    const ct = fromBase64Url(String(b.ct));
    if (!salt || salt.length !== 16 || !iv || iv.length !== 12 || !ct) return null;
    const key = await passphraseKey(passphrase, salt, b.iterations, "decrypt");
    const plain = await api.decrypt({ name: "AES-GCM", iv }, key, ct);
    const jwk = JSON.parse(new TextDecoder().decode(plain)) as JsonWebKey;
    return jwk && jwk.kty === "RSA" && typeof jwk.d === "string" ? jwk : null;
  } catch {
    return null;
  }
}

/** The public half of a private key, in the form that is stored on the server. */
export function publicKeyOf(privateJwk: JsonWebKey): string | null {
  const jwk = cleanPublicKey({ kty: privateJwk.kty, alg: "RSA-OAEP-256", n: privateJwk.n, e: privateJwk.e });
  return jwk ? publicKeyText(jwk) : null;
}

/**
 * A public key's fingerprint: the first 20 hex characters of the SHA-256 of its stable text.
 * The server computes the same thing (`workspaceKeyId` in `programme-register.ts`), a test pins
 * that they agree, and a person and a team can read it to each other to check they mean the same key.
 */
export async function keyIdOf(publicKey: unknown): Promise<string | null> {
  const api = subtle();
  const jwk = cleanPublicKey(publicKey);
  if (!api || !jwk) return null;
  const digest = new Uint8Array(await api.digest("SHA-256", new TextEncoder().encode(publicKeyText(jwk))));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, WORKSPACE_LIMITS.keyIdChars);
}
