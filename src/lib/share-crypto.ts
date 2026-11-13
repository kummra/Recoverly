/**
 * Scrambling and unscrambling a summary, on the person's own device.
 *
 * AES-256-GCM through the browser's own Web Crypto (no library): a fresh random
 * key and a fresh random 12-byte nonce for every summary, so a key is never used
 * twice. GCM also authenticates, so a link that was changed, cut short or paired
 * with the wrong stored copy fails to open instead of showing something wrong.
 *
 * The key goes into the link after `#` and nowhere else. Recoverly receives the
 * nonce and the ciphertext, never the key, and so cannot read what it stores.
 */
import { type ShareSnapshot, fromBase64Url, sanitiseSnapshot, toBase64Url } from "@/lib/share";

/** What is stored on the server: the nonce and the ciphertext. */
export type SealedShare = { iv: string; ct: string };
/** What goes into the link. */
export type SealedShareWithKey = SealedShare & { key: string };

/** Web Crypto, if this environment has it (every current browser, on https or localhost). */
function subtle(): SubtleCrypto | null {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return c && c.subtle && typeof c.getRandomValues === "function" ? c.subtle : null;
}

export function cryptoAvailable(): boolean {
  return subtle() !== null;
}

/** Scramble a summary with a brand-new key. Throws if the browser cannot (`cryptoAvailable()` says so first). */
export async function sealSnapshot(snapshot: ShareSnapshot): Promise<SealedShareWithKey> {
  const api = subtle();
  if (!api) throw new Error("Web Crypto is not available");
  const rawKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await api.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const plaintext = new TextEncoder().encode(JSON.stringify(snapshot));
  const ciphertext = new Uint8Array(await api.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  return { key: toBase64Url(rawKey), iv: toBase64Url(iv), ct: toBase64Url(ciphertext) };
}

/**
 * Unscramble a summary. `null` for any failure: a wrong, short or changed key, a
 * changed stored copy, something that is not a summary. The reader is told only
 * that the link could not be opened, never why.
 */
export async function openSnapshot(parts: SealedShareWithKey): Promise<ShareSnapshot | null> {
  const api = subtle();
  if (!api) return null;
  try {
    const rawKey = fromBase64Url(parts.key);
    const iv = fromBase64Url(parts.iv);
    const ciphertext = fromBase64Url(parts.ct);
    if (!rawKey || rawKey.length !== 32 || !iv || iv.length !== 12 || !ciphertext || ciphertext.length < 16) return null;
    const key = await api.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
    const plaintext = await api.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return sanitiseSnapshot(JSON.parse(new TextDecoder().decode(plaintext)));
  } catch {
    return null;
  }
}
