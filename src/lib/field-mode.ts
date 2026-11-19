/**
 * Shared-phone mode: what "next person, clear this phone" removes. Field workers, camp volunteers and NGO staff often help
 * several people on one phone, so the end of each person's turn has to leave nothing of theirs behind for the next.
 *
 * Everything this app keeps on a device lives in `localStorage` under a key that starts with `recoverly:` (the language, a
 * joined programme, plans, the person to call, reminder times, quiet hours, the privacy lock, a team key). Records and chats live in
 * the person's own account, not on the phone, so signing out and clearing these keys leaves the phone clean without deleting anyone's
 * account. The service worker caches only the static app shell, never anything personal, so there is nothing to clear there.
 */
export const APP_STORAGE_PREFIX = "recoverly:";

type KeyedStore = { length: number; key(index: number): string | null; removeItem(key: string): void };

/** The saved keys that belong to this app. Collected first, because removing while counting would skip some. */
export function appStorageKeys(store: Pick<KeyedStore, "length" | "key">): string[] {
  const keys: string[] = [];
  for (let index = 0; index < store.length; index++) {
    const key = store.key(index);
    if (key && key.startsWith(APP_STORAGE_PREFIX)) keys.push(key);
  }
  return keys;
}

/** Remove everything this app saved. Anything else in the same storage is left alone. Returns how many keys were removed. */
export function clearAppStorage(store: KeyedStore): number {
  let removed = 0;
  for (const key of appStorageKeys(store)) {
    try {
      store.removeItem(key);
      removed += 1;
    } catch {
      /* a key that cannot be removed is skipped; the rest still are */
    }
  }
  return removed;
}
