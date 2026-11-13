/**
 * What the server does with a summary link, with no framework in the way so it
 * can be tested without a database: a small `ShareStore` goes in, answers come out.
 * The routes in `app/api/share` are thin wrappers over this, and
 * `share-firestore.ts` is the real store.
 *
 * The server only ever holds the **scrambled** copy of a summary (see
 * `share-crypto.ts`): a nonce, the ciphertext, who made it (so they can stop it
 * and so it goes when they delete their account) and when it ends. It cannot read
 * the contents and is never given the key.
 *
 * Answers are deliberately flat. A link that never existed, one that ended and one
 * that was stopped all give the same "not found", so an address cannot be used to
 * learn anything about it.
 */
import {
  SHARE_LIMITS,
  isExpiryHours,
  isShareCiphertext,
  isShareId,
  isShareIv,
  toBase64Url
} from "@/lib/share";

export type ShareRecord = {
  id: string;
  /** Who made it. Only so they can stop it, and so it goes with their account. */
  uid: string;
  iv: string;
  ct: string;
  /** Milliseconds since the epoch. */
  createdAt: number;
  expiresAt: number;
};

export interface ShareStore {
  /** `false` if that id is already taken. */
  create(record: ShareRecord): Promise<boolean>;
  get(id: string): Promise<ShareRecord | null>;
  listByOwner(uid: string): Promise<ShareRecord[]>;
  delete(id: string): Promise<void>;
  /** Everything this person made. Returns how many were removed. */
  deleteByOwner(uid: string): Promise<number>;
  /** Up to `limit` summaries whose time is up. Returns how many were removed. */
  deleteExpired(now: number, limit: number): Promise<number>;
}

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const fail = (status: number, error: string): { ok: false; status: number; error: string } => ({ ok: false, status, error });

/** A new address: 16 random bytes. Collisions are not a practical worry, but `create` is checked anyway. */
export function newShareId(): string {
  return toBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(16)));
}

/** Clear out summaries whose time is up. Housekeeping: it must never fail the request that triggered it. */
async function sweep(store: ShareStore, now: number): Promise<void> {
  try {
    await store.deleteExpired(now, 20);
  } catch {
    /* an expired copy that lingers an hour more is harmless: nobody can read it, and it is refused when asked for */
  }
}

export type CreateInput = { iv?: unknown; ct?: unknown; hours?: unknown };
export type CreatedShare = { id: string; createdAt: number; expiresAt: number };

export async function createShare(store: ShareStore, uid: string, input: CreateInput, now: number): Promise<ServiceResult<CreatedShare>> {
  if (!isShareIv(input.iv) || !isShareCiphertext(input.ct) || !isExpiryHours(input.hours)) return fail(400, "invalid");

  const mine = (await store.listByOwner(uid)).filter((record) => record.expiresAt > now);
  if (mine.length >= SHARE_LIMITS.activeMax) return fail(409, "limit");

  const createdAt = now;
  const expiresAt = now + input.hours * 60 * 60 * 1000;
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newShareId();
    if (await store.create({ id, uid, iv: input.iv, ct: input.ct, createdAt, expiresAt })) {
      await sweep(store, now);
      return { ok: true, value: { id, createdAt, expiresAt } };
    }
  }
  return fail(500, "unavailable");
}

export type PublicShare = { iv: string; ct: string; createdAt: number; expiresAt: number };

/** What anyone with the address gets: the scrambled copy. Useless without the key, which is not here. */
export async function readShare(store: ShareStore, id: string, now: number): Promise<ServiceResult<PublicShare>> {
  if (!isShareId(id)) return fail(404, "not-found");
  const record = await store.get(id);
  if (!record) return fail(404, "not-found");
  if (record.expiresAt <= now) {
    // Over. Remove it now rather than leave it for the next sweep.
    await store.delete(id).catch(() => undefined);
    return fail(404, "not-found");
  }
  return { ok: true, value: { iv: record.iv, ct: record.ct, createdAt: record.createdAt, expiresAt: record.expiresAt } };
}

export type OwnShare = { id: string; createdAt: number; expiresAt: number };

/** The links this person has running, newest first. Anything past its time is removed on the way. */
export async function listShares(store: ShareStore, uid: string, now: number): Promise<ServiceResult<OwnShare[]>> {
  const all = await store.listByOwner(uid);
  const live = all.filter((record) => record.expiresAt > now);
  for (const record of all) if (record.expiresAt <= now) await store.delete(record.id).catch(() => undefined);
  live.sort((a, b) => b.createdAt - a.createdAt);
  return { ok: true, value: live.map(({ id, createdAt, expiresAt }) => ({ id, createdAt, expiresAt })) };
}

/** Stop one link. Only its maker can; anyone else is told it was not found. */
export async function stopShare(store: ShareStore, uid: string, id: string): Promise<ServiceResult<true>> {
  if (!isShareId(id)) return fail(404, "not-found");
  const record = await store.get(id);
  if (!record || record.uid !== uid) return fail(404, "not-found");
  await store.delete(id);
  return { ok: true, value: true };
}

/** Stop everything this person has shared. Also what account deletion calls. */
export async function stopAllShares(store: ShareStore, uid: string): Promise<ServiceResult<number>> {
  return { ok: true, value: await store.deleteByOwner(uid) };
}
