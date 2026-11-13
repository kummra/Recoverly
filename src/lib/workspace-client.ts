/**
 * The browser's side of the team workspace (`workspace.ts`): scramble the summary here for the
 * team's key, send only the scrambled copy, and ask the server what the person is sharing.
 *
 * What the person sends is the same kind of summary as a link (`share.ts`), scrambled on this
 * device with a one-off key that is itself locked to the team's public key
 * (`workspace-crypto.ts`). Only the holder of the team's private key can read it. The team's
 * public key comes from the server's register; the fingerprint the server gives is checked here
 * against the key it came with, so the key shown to the person is the key used.
 *
 * Nothing about it is kept on this device: whether the person is sharing is asked of the server
 * each time, so the screen can never claim something the server does not hold.
 */
import { normaliseCode } from "@/lib/programme";
import { type ShareSnapshot, hasContent } from "@/lib/share";
import { cleanPublicKey, isKeyId } from "@/lib/workspace";
import { type WorkspaceSealed, generateWorkspaceKeys, keyIdOf, sealForWorkspace, workspaceCryptoAvailable } from "@/lib/workspace-crypto";

type Fetch = typeof fetch;

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** The team a summary is for: a real key to scramble for, or the sample programme's practice (nothing is stored). */
export type TeamKey = { practice: false; publicKey: JsonWebKey; keyId: string } | { practice: true };

export type TeamKeyOutcome = { ok: true; team: TeamKey } | { ok: false; reason: "not-found" | "busy" | "unavailable" | "network" };

/** Ask which key to scramble for. The answer is public: it is the team's public key and its fingerprint. */
export async function fetchTeamKey(code: string, token: string | null, fetchImpl: Fetch = fetch): Promise<TeamKeyOutcome> {
  const clean = normaliseCode(code);
  if (!clean) return { ok: false, reason: "not-found" };
  try {
    const response = await fetchImpl(`/api/workspace?code=${encodeURIComponent(clean)}`, { headers: authHeaders(token), cache: "no-store" });
    if (response.status === 404) return { ok: false, reason: "not-found" };
    if (response.status === 429) return { ok: false, reason: "busy" };
    if (!response.ok) return { ok: false, reason: "unavailable" };
    const data = (await response.json()) as { practice?: unknown; publicKey?: unknown; keyId?: unknown };
    if (data.practice === true) return { ok: true, team: { practice: true } };
    const publicKey = cleanPublicKey(data.publicKey);
    // The fingerprint we are about to show the person must be that of the key we are about to use.
    if (!publicKey || !isKeyId(data.keyId) || (await keyIdOf(publicKey)) !== data.keyId) return { ok: false, reason: "unavailable" };
    return { ok: true, team: { practice: false, publicKey, keyId: data.keyId } };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export type SendOutcome =
  | { ok: true; createdAt: number; updatedAt: number; expiresAt: number; stored: boolean }
  /** crypto: this browser cannot scramble. empty: nothing was ticked. key-changed: the team's key is not the one used (ask again).
   *  not-found: no workspace here. limit: too many teams. busy: asked too often. unavailable/network: try again. */
  | { ok: false; reason: "crypto" | "empty" | "key-changed" | "not-found" | "limit" | "busy" | "unavailable" | "network" };

/**
 * Scramble the summary for the team and send it. For the sample programme the whole thing runs the
 * same way, with a key made here that nobody holds, and the server stores nothing.
 */
export async function sendToTeam(options: { snapshot: ShareSnapshot; code: string; team: TeamKey; token: string | null; fetchImpl?: Fetch }): Promise<SendOutcome> {
  if (!workspaceCryptoAvailable()) return { ok: false, reason: "crypto" };
  if (!hasContent(options.snapshot)) return { ok: false, reason: "empty" };
  const code = normaliseCode(options.code);
  if (!code) return { ok: false, reason: "not-found" };

  const doFetch = options.fetchImpl ?? fetch;
  try {
    let publicKey: JsonWebKey;
    let keyId: string;
    if (options.team.practice) {
      publicKey = (await generateWorkspaceKeys()).publicJwk;
      keyId = (await keyIdOf(publicKey)) ?? "0".repeat(20);
    } else {
      publicKey = options.team.publicKey;
      keyId = options.team.keyId;
    }
    const sealed: WorkspaceSealed = await sealForWorkspace(options.snapshot, publicKey);
    const response = await doFetch("/api/workspace/copy", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders(options.token) },
      body: JSON.stringify({ code, keyId, ...sealed })
    });
    if (response.status === 409) {
      const data = (await response.json().catch(() => ({}))) as { error?: unknown };
      return { ok: false, reason: data.error === "limit" ? "limit" : "key-changed" };
    }
    if (response.status === 404) return { ok: false, reason: "not-found" };
    if (response.status === 429) return { ok: false, reason: "busy" };
    if (!response.ok) return { ok: false, reason: "unavailable" };
    const data = (await response.json()) as { createdAt?: unknown; updatedAt?: unknown; expiresAt?: unknown; stored?: unknown };
    if (typeof data.createdAt !== "number" || typeof data.updatedAt !== "number" || typeof data.expiresAt !== "number") return { ok: false, reason: "unavailable" };
    return { ok: true, createdAt: data.createdAt, updatedAt: data.updatedAt, expiresAt: data.expiresAt, stored: data.stored !== false };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export type OwnCopy = { code: string; createdAt: number; updatedAt: number; expiresAt: number; current: boolean };

/** What this person shares now, or `null` if it could not be fetched. */
export async function listOwnCopies(token: string | null, fetchImpl: Fetch = fetch): Promise<OwnCopy[] | null> {
  try {
    const response = await fetchImpl("/api/workspace/copy", { headers: authHeaders(token), cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { copies?: unknown };
    if (!Array.isArray(data.copies)) return null;
    return data.copies.filter((item): item is OwnCopy => {
      const c = item as Partial<OwnCopy> | null;
      return typeof c === "object" && c !== null && typeof c.code === "string" && normaliseCode(c.code) !== null && typeof c.createdAt === "number" && typeof c.updatedAt === "number" && typeof c.expiresAt === "number" && typeof c.current === "boolean";
    });
  } catch {
    return null;
  }
}

/** Stop sharing with one team: the copy is deleted. `true` once it is gone (including "it was already gone"). */
export async function stopOwnCopy(token: string | null, code: string, fetchImpl: Fetch = fetch): Promise<boolean> {
  const clean = normaliseCode(code);
  if (!clean) return false;
  try {
    const response = await fetchImpl(`/api/workspace/copy?code=${encodeURIComponent(clean)}`, { method: "DELETE", headers: authHeaders(token) });
    return response.ok;
  } catch {
    return false;
  }
}

/** Stop everything this person shares. */
export async function stopAllOwnCopies(token: string | null, fetchImpl: Fetch = fetch): Promise<boolean> {
  try {
    const response = await fetchImpl("/api/workspace/copy?all=1", { method: "DELETE", headers: authHeaders(token) });
    return response.ok;
  } catch {
    return false;
  }
}

export type InboxCopy = { id: string; iv: string; ct: string; wk: string; createdAt: number; updatedAt: number; expiresAt: number };
export type InboxOutcome =
  | { ok: true; name: string; keyId: string | null; copies: InboxCopy[] }
  | { ok: false; reason: "not-found" | "busy" | "failed" };

/** The team's scrambled copies, using the team's private link as the proof it is the team. Sent in a header, never in the address. */
export async function fetchInbox(reportKey: string, fetchImpl: Fetch = fetch): Promise<InboxOutcome> {
  try {
    const response = await fetchImpl("/api/workspace/inbox", { headers: authHeaders(reportKey), cache: "no-store", credentials: "omit" });
    if (response.status === 404) return { ok: false, reason: "not-found" };
    if (response.status === 429) return { ok: false, reason: "busy" };
    if (!response.ok) return { ok: false, reason: "failed" };
    const data = (await response.json()) as { name?: unknown; keyId?: unknown; copies?: unknown };
    if (typeof data.name !== "string" || !Array.isArray(data.copies)) return { ok: false, reason: "failed" };
    const copies = data.copies.filter((item): item is InboxCopy => {
      const c = item as Partial<InboxCopy> | null;
      return (
        typeof c === "object" &&
        c !== null &&
        [c.id, c.iv, c.ct, c.wk].every((field) => typeof field === "string") &&
        [c.createdAt, c.updatedAt, c.expiresAt].every((field) => typeof field === "number")
      );
    });
    return { ok: true, name: data.name, keyId: isKeyId(data.keyId) ? data.keyId : null, copies };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
