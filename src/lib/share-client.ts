/**
 * The browser's side of summary links: scramble the summary here, send only the
 * scrambled copy, and build the link with the key kept out of every request.
 *
 * Nothing about a link is kept on this device. The person copies it when it is
 * made (the screen says it cannot be shown again) and hands it over; if they lose
 * it they stop that link and make another, which costs nothing. That keeps one
 * thing less to remember to clear on a shared phone, and one promise less to make.
 */
import { type ShareExpiryHours, type ShareSnapshot, buildShareLink, hasContent, isShareId } from "@/lib/share";
import { cryptoAvailable, sealSnapshot } from "@/lib/share-crypto";

type Fetch = typeof fetch;

export type CreateOutcome =
  | { ok: true; id: string; link: string; createdAt: number; expiresAt: number }
  /** crypto: this browser cannot scramble. empty: nothing was ticked. limit: too many links already.
   *  busy: asked too often. unavailable: the server cannot do it now. network: no answer. */
  | { ok: false; reason: "crypto" | "empty" | "limit" | "busy" | "unavailable" | "network" };

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createShareLink(options: {
  snapshot: ShareSnapshot;
  hours: ShareExpiryHours;
  token: string | null;
  origin: string;
  fetchImpl?: Fetch;
}): Promise<CreateOutcome> {
  if (!cryptoAvailable()) return { ok: false, reason: "crypto" };
  if (!hasContent(options.snapshot)) return { ok: false, reason: "empty" };

  const doFetch = options.fetchImpl ?? fetch;
  try {
    // Scrambled here. Only the nonce and the ciphertext are sent; the key stays in this function.
    const { key, iv, ct } = await sealSnapshot(options.snapshot);
    const response = await doFetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(options.token) },
      body: JSON.stringify({ iv, ct, hours: options.hours })
    });
    if (response.status === 409) return { ok: false, reason: "limit" };
    if (response.status === 429) return { ok: false, reason: "busy" };
    if (!response.ok) return { ok: false, reason: "unavailable" };
    const data = (await response.json()) as { id?: unknown; createdAt?: unknown; expiresAt?: unknown };
    if (!isShareId(data.id) || typeof data.createdAt !== "number" || typeof data.expiresAt !== "number") return { ok: false, reason: "unavailable" };
    return { ok: true, id: data.id, link: buildShareLink(options.origin, data.id, key), createdAt: data.createdAt, expiresAt: data.expiresAt };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export type OwnShare = { id: string; createdAt: number; expiresAt: number };

/** The links this person has running, or `null` if they could not be fetched. */
export async function listOwnShares(token: string | null, fetchImpl: Fetch = fetch): Promise<OwnShare[] | null> {
  try {
    const response = await fetchImpl("/api/share", { headers: authHeaders(token) });
    if (!response.ok) return null;
    const data = (await response.json()) as { shares?: unknown };
    if (!Array.isArray(data.shares)) return null;
    return data.shares.filter(
      (item): item is OwnShare =>
        typeof item === "object" && item !== null && isShareId((item as OwnShare).id) && typeof (item as OwnShare).createdAt === "number" && typeof (item as OwnShare).expiresAt === "number"
    );
  } catch {
    return null;
  }
}

/** Stop one link. `true` once it no longer works (including "it was already gone"). */
export async function stopOwnShare(token: string | null, id: string, fetchImpl: Fetch = fetch): Promise<boolean> {
  if (!isShareId(id)) return false;
  try {
    const response = await fetchImpl(`/api/share?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders(token) });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

/** Stop every link this person has. */
export async function stopAllOwnShares(token: string | null, fetchImpl: Fetch = fetch): Promise<boolean> {
  try {
    const response = await fetchImpl("/api/share?all=1", { method: "DELETE", headers: authHeaders(token) });
    return response.ok;
  } catch {
    return false;
  }
}

export type OpenOutcome =
  | { ok: true; iv: string; ct: string; createdAt: number; expiresAt: number }
  /** gone: not found, ended or stopped (the server says the same for all three). */
  | { ok: false; reason: "gone" | "busy" | "failed" };

/** Fetch the scrambled copy behind a link. Sends only the address: never the key. */
export async function fetchSharedCopy(id: string, options: { fetchImpl?: Fetch; signal?: AbortSignal } = {}): Promise<OpenOutcome> {
  if (!isShareId(id)) return { ok: false, reason: "gone" };
  const doFetch = options.fetchImpl ?? fetch;
  try {
    const response = await doFetch(`/api/share/${id}`, { signal: options.signal, credentials: "omit", cache: "no-store" });
    if (response.status === 404) return { ok: false, reason: "gone" };
    if (response.status === 429) return { ok: false, reason: "busy" };
    if (!response.ok) return { ok: false, reason: "failed" };
    const data = (await response.json()) as { iv?: unknown; ct?: unknown; createdAt?: unknown; expiresAt?: unknown };
    if (typeof data.iv !== "string" || typeof data.ct !== "string" || typeof data.createdAt !== "number" || typeof data.expiresAt !== "number") return { ok: false, reason: "failed" };
    return { ok: true, iv: data.iv, ct: data.ct, createdAt: data.createdAt, expiresAt: data.expiresAt };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
