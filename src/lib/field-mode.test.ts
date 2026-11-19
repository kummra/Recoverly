import { describe, expect, it } from "vitest";

import { APP_STORAGE_PREFIX, appStorageKeys, clearAppStorage } from "@/lib/field-mode";

/** A storage that behaves like the browser's: indexed by position, and positions shift when something is removed. */
function fakeStorage(entries: Record<string, string>, failOn: string[] = []) {
  const data = new Map(Object.entries(entries));
  return {
    data,
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem(key: string) {
      if (failOn.includes(key)) throw new Error("blocked");
      data.delete(key);
    }
  };
}

const SAVED = {
  "recoverly:locale": "ta",
  "recoverly:programme:u1": "{}",
  "recoverly:plans:u1": "[]",
  "recoverly:person:u1": "{}",
  "recoverly:lock": "hash",
  "recoverly:lock:attempts": "2",
  "recoverly:quietHours": "{}",
  "recoverly:workspace-key:ABC": "{}",
  "recoverly:risk-dates:u1": "[]"
};

describe("which keys are this app's", () => {
  it("is every key that starts with the app's prefix, and nothing else", () => {
    const store = fakeStorage({ ...SAVED, theme: "dark", "other-app:x": "1", "recoverlyX": "1", "Recoverly:locale": "en" });
    expect(appStorageKeys(store).sort()).toEqual(Object.keys(SAVED).sort());
    expect(APP_STORAGE_PREFIX).toBe("recoverly:");
  });
});

describe("clearing the phone between people", () => {
  it("removes every saved choice, however many there are, and leaves other data alone", () => {
    const store = fakeStorage({ ...SAVED, theme: "dark" });
    expect(clearAppStorage(store)).toBe(Object.keys(SAVED).length);
    expect([...store.data.keys()]).toEqual(["theme"]);
  });

  it("does nothing, and says so, when nothing was saved", () => {
    const store = fakeStorage({ theme: "dark" });
    expect(clearAppStorage(store)).toBe(0);
    expect(store.data.size).toBe(1);
  });

  it("carries on past a key it cannot remove", () => {
    const store = fakeStorage(SAVED, ["recoverly:lock"]);
    expect(clearAppStorage(store)).toBe(Object.keys(SAVED).length - 1);
    expect([...store.data.keys()]).toEqual(["recoverly:lock"]);
  });
});
