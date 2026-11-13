/**
 * What the server does with a team workspace (`workspace.ts`), with no framework in the way
 * so it can be tested without a database: a small `WorkspaceStore` goes in, answers come out.
 * The routes in `app/api/workspace` are thin wrappers, and `workspace-firestore.ts` is the
 * real store.
 *
 * The server only ever holds the **scrambled** copy of a summary (`workspace-crypto.ts`): a
 * nonce, the ciphertext, the wrapped key that only the team's private key can open, which
 * team it is for, who sent it (so the person can stop it and so it goes with their account)
 * and when it ends. It cannot read it. Which team a copy is for is the programme the person
 * is in, and the team receives the copies without that person's account: only an opaque id.
 *
 * Answers are flat: a programme with no workspace, one that may not have one and one that does
 * not exist all say "not found", so a request cannot be used to learn which do.
 */
import { WORKSPACE_EXPIRY_MS, WORKSPACE_LIMITS, type WorkspaceTeam, isKeyId, isWorkspaceCiphertext, isWorkspaceIv, isWrappedKey } from "@/lib/workspace";
import { toBase64Url } from "@/lib/share";

export type WorkspaceCopy = {
  /** Opaque, random. What the team sees instead of a person. Kept when the person updates. */
  id: string;
  /** Who sent it. Only so they can stop it and so it goes with their account: never sent to the team. */
  uid: string;
  /** Which programme's team it is for. */
  code: string;
  /** The fingerprint of the team key it was scrambled for. */
  keyId: string;
  iv: string;
  ct: string;
  wk: string;
  /** Milliseconds since the epoch. */
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export interface WorkspaceStore {
  listByOwner(uid: string): Promise<WorkspaceCopy[]>;
  listByCode(code: string, limit: number): Promise<WorkspaceCopy[]>;
  /** Create or replace the copy with this id. */
  put(copy: WorkspaceCopy): Promise<void>;
  delete(id: string): Promise<void>;
  /** Everything this person sent. Returns how many were removed. */
  deleteByOwner(uid: string): Promise<number>;
  /** What this person sent to one team. Returns how many were removed. */
  deleteByOwnerAndCode(uid: string, code: string): Promise<number>;
  /** Up to `limit` copies whose time is up. Returns how many were removed. */
  deleteExpired(now: number, limit: number): Promise<number>;
}

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const fail = (status: number, error: string): { ok: false; status: number; error: string } => ({ ok: false, status, error });

export function newCopyId(): string {
  return toBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(16)));
}

/** Clear out copies whose time is up. Housekeeping: it must never fail the request that triggered it. */
async function sweep(store: WorkspaceStore, now: number): Promise<void> {
  try {
    await store.deleteExpired(now, 20);
  } catch {
    /* an expired copy that lingers is harmless: nobody is shown it, and it is refused when asked for */
  }
}

export type PutInput = { keyId?: unknown; iv?: unknown; ct?: unknown; wk?: unknown };
export type PutResult = { createdAt: number; updatedAt: number; expiresAt: number; stored: boolean };

/**
 * A person sends (or updates) their copy for a team. `team` is the programme's workspace from the
 * register, or `null` if there is none to share with. The copy must be scrambled for the key the
 * register holds now: one made for an older key answers "key-changed", so the person's device asks
 * again rather than sending something the team can no longer read. The sample programme answers as
 * a real one would and stores nothing.
 */
export async function putCopy(store: WorkspaceStore, team: WorkspaceTeam | null, uid: string, input: PutInput, now: number): Promise<ServiceResult<PutResult>> {
  if (!team) return fail(404, "not-found");
  if (!isKeyId(input.keyId) || !isWorkspaceIv(input.iv) || !isWorkspaceCiphertext(input.ct) || !isWrappedKey(input.wk)) return fail(400, "invalid");

  const expiresAt = now + WORKSPACE_EXPIRY_MS;
  if (team.practice) return { ok: true, value: { createdAt: now, updatedAt: now, expiresAt, stored: false } };
  if (!team.keyId) return fail(404, "not-found");
  if (input.keyId !== team.keyId) return fail(409, "key-changed");

  const mine = (await store.listByOwner(uid)).filter((copy) => copy.expiresAt > now);
  const existing = mine.find((copy) => copy.code === team.code);
  if (!existing && mine.length >= WORKSPACE_LIMITS.perPersonMax) return fail(409, "limit");

  const copy: WorkspaceCopy = {
    id: existing?.id ?? newCopyId(),
    uid,
    code: team.code,
    keyId: input.keyId,
    iv: input.iv,
    ct: input.ct,
    wk: input.wk,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    expiresAt
  };
  await store.put(copy);
  await sweep(store, now);
  return { ok: true, value: { createdAt: copy.createdAt, updatedAt: now, expiresAt, stored: true } };
}

export type OwnCopy = {
  code: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  /** Made for the key the team has now. `false`: the team's key has changed since, so this copy can no longer be read. */
  current: boolean;
};

/**
 * What this person is sharing now, newest first. `currentKeyId(code)` is the fingerprint of that
 * team's key in the register. Anything past its time is removed on the way.
 */
export async function listOwnCopies(store: WorkspaceStore, uid: string, now: number, currentKeyId: (code: string) => string | null): Promise<ServiceResult<OwnCopy[]>> {
  const all = await store.listByOwner(uid);
  for (const copy of all) if (copy.expiresAt <= now) await store.delete(copy.id).catch(() => undefined);
  const live = all.filter((copy) => copy.expiresAt > now).sort((a, b) => b.updatedAt - a.updatedAt);
  return {
    ok: true,
    value: live.map(({ code, createdAt, updatedAt, expiresAt, keyId }) => ({ code, createdAt, updatedAt, expiresAt, current: currentKeyId(code) === keyId }))
  };
}

/** The person stops sharing with one team: the copy is deleted. Not finding one is fine; it is already stopped. */
export async function stopCopy(store: WorkspaceStore, uid: string, code: string): Promise<ServiceResult<number>> {
  return { ok: true, value: await store.deleteByOwnerAndCode(uid, code) };
}

/** Stop everything this person shares. Also what account deletion calls. */
export async function stopAllCopies(store: WorkspaceStore, uid: string): Promise<ServiceResult<number>> {
  return { ok: true, value: await store.deleteByOwner(uid) };
}

export type InboxCopy = { id: string; iv: string; ct: string; wk: string; createdAt: number; updatedAt: number; expiresAt: number };
export type Inbox = { name: string; keyId: string | null; copies: InboxCopy[] };

/**
 * What a team is handed: the scrambled copies sent to it that are for its current key and have not
 * ended, most recently updated first. No account, no address, nothing about the sender. Copies made
 * for an older key are not listed (the team cannot read them, and their senders are told the key
 * changed). `team` comes from the team's private link, so only the team's holder asks.
 */
export async function readInbox(store: WorkspaceStore, team: WorkspaceTeam, now: number): Promise<ServiceResult<Inbox>> {
  const all = await store.listByCode(team.code, WORKSPACE_LIMITS.inboxMax);
  for (const copy of all) if (copy.expiresAt <= now) await store.delete(copy.id).catch(() => undefined);
  const copies = all
    .filter((copy) => copy.expiresAt > now && team.keyId !== null && copy.keyId === team.keyId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(({ id, iv, ct, wk, createdAt, updatedAt, expiresAt }) => ({ id, iv, ct, wk, createdAt, updatedAt, expiresAt }));
  return { ok: true, value: { name: team.name, keyId: team.keyId, copies } };
}
