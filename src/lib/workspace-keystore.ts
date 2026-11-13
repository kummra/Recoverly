/**
 * Where a team keeps its private key in a browser: locked, never in the clear.
 *
 * The key is made on the team's own page and locked with a passphrase only the team knows
 * (`workspace-crypto.ts`); what is kept here, and what the team can save as a file to open the
 * workspace from another browser, is that locked form. The unlocked key lives only in the page's
 * memory while it is open. Nothing here is ever sent to a server. A browser that clears its site
 * data loses the locked key, which is why the page asks the team to save the file.
 */
import { normaliseCode } from "@/lib/programme";
import { cleanPublicKey } from "@/lib/workspace";
import type { ProtectedKey } from "@/lib/workspace-crypto";

export function workspaceKeyStorageKey(code: string): string {
  return `recoverly:workspace-key:${code}`;
}

/** Is this the shape of a locked key? (Opening it is `unlockPrivateKey`'s job; this only keeps junk out of storage and files.) */
export function isProtectedKey(value: unknown): value is ProtectedKey {
  if (typeof value !== "object" || value === null) return false;
  const b = value as Record<string, unknown>;
  return b.v === 1 && b.kdf === "PBKDF2-SHA256" && typeof b.iterations === "number" && [b.salt, b.iv, b.ct].every((field) => typeof field === "string" && field.length > 0 && field.length < 5_000);
}

export function loadProtectedKey(code: string): ProtectedKey | null {
  const clean = normaliseCode(code);
  if (!clean) return null;
  try {
    const raw = window.localStorage.getItem(workspaceKeyStorageKey(clean));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isProtectedKey(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** `false` if the browser refused to store it, so the page can say so. */
export function saveProtectedKey(code: string, key: ProtectedKey): boolean {
  const clean = normaliseCode(code);
  if (!clean) return false;
  try {
    window.localStorage.setItem(workspaceKeyStorageKey(clean), JSON.stringify(key));
    return true;
  } catch {
    return false;
  }
}

export function workspacePublicStorageKey(code: string): string {
  return `recoverly:workspace-public:${code}`;
}

/** The team's own public key, kept beside its locked key until the key has been registered. It is public: there is nothing to protect in it. */
export function loadStoredPublicKey(code: string): JsonWebKey | null {
  const clean = normaliseCode(code);
  if (!clean) return null;
  try {
    const raw = window.localStorage.getItem(workspacePublicStorageKey(clean));
    return raw ? cleanPublicKey(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveStoredPublicKey(code: string, publicKey: JsonWebKey): boolean {
  const clean = normaliseCode(code);
  const key = cleanPublicKey(publicKey);
  if (!clean || !key) return false;
  try {
    window.localStorage.setItem(workspacePublicStorageKey(clean), JSON.stringify(key));
    return true;
  } catch {
    return false;
  }
}

/** Forget the locked key and the public key kept with it (starting over). */
export function clearProtectedKey(code: string): void {
  const clean = normaliseCode(code);
  if (!clean) return;
  try {
    window.localStorage.removeItem(workspaceKeyStorageKey(clean));
    window.localStorage.removeItem(workspacePublicStorageKey(clean));
  } catch {
    /* nothing stored, or storage unavailable: nothing to remove */
  }
}

/** The text of the key file the team saves: the locked key (and the public key that goes with it), labelled so it is recognisable. */
export function keyFileText(code: string, key: ProtectedKey, publicKey?: JsonWebKey | null): string {
  const pub = publicKey ? cleanPublicKey(publicKey) : null;
  return JSON.stringify({ recoverlyWorkspaceKey: code, ...(pub ? { publicKey: pub } : {}), ...key }, null, 2);
}

/** The public key in a saved key file, if it has one. */
export function keyFilePublicKey(text: string): JsonWebKey | null {
  if (text.length > 20_000) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? cleanPublicKey((parsed as { publicKey?: unknown }).publicKey) : null;
  } catch {
    return null;
  }
}

/** A saved key file read back, or `null` if it is not one. */
export function parseKeyFile(text: string): ProtectedKey | null {
  if (text.length > 20_000) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { v, kdf, iterations, salt, iv, ct } = parsed as Record<string, unknown>;
    const key = { v, kdf, iterations, salt, iv, ct };
    return isProtectedKey(key) ? key : null;
  } catch {
    return null;
  }
}
