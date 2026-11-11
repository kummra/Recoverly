import { describe, expect, it } from "vitest";

import {
  ATTEMPTS_KEY,
  DEFAULT_IDLE_MINUTES,
  FREE_ATTEMPTS,
  LOCK_KEY,
  MAX_WAIT_SECONDS,
  type KeyValueStore,
  afterWrongPin,
  checkNewPin,
  clearLastActive,
  clearLockConfig,
  createLockConfig,
  isEasyPin,
  loadLockConfig,
  parseAttempts,
  parseLockConfig,
  readLastActive,
  remainingWait,
  saveLockConfig,
  shouldLock,
  verifyPin,
  waitAfterFailures,
  writeLastActive
} from "@/lib/app-lock";

/** A stand-in for localStorage. */
function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key)
  };
}

describe("PIN rules", () => {
  it("accepts four to six digits that are not a pattern", () => {
    for (const pin of ["2580", "7391", "482615", "90817"]) expect(checkNewPin(pin), pin).toBeNull();
  });

  it("refuses the wrong length, and anything that is not digits", () => {
    for (const pin of ["", "123", "1234567", "12a4", "12 45", "１２３４"]) expect(checkNewPin(pin), pin).toBe("length");
  });

  it("refuses the first things someone who picked up the phone would try", () => {
    for (const pin of ["0000", "1111", "999999", "1234", "4321", "123456", "6543", "2345"]) {
      expect(isEasyPin(pin), pin).toBe(true);
      expect(checkNewPin(pin), pin).toBe("easy");
    }
  });

  it("does not call an ordinary PIN easy", () => {
    for (const pin of ["1357", "2468", "1212", "1590"]) expect(isEasyPin(pin), pin).toBe(false);
  });
});

describe("hashing", () => {
  it("accepts the right PIN and refuses a wrong one", async () => {
    const config = await createLockConfig("2580", 5);
    expect(await verifyPin("2580", config)).toBe(true);
    expect(await verifyPin("2581", config)).toBe(false);
    expect(await verifyPin("", config)).toBe(false);
  });

  it("never stores the PIN", async () => {
    const config = await createLockConfig("2580", 1);
    expect(JSON.stringify(config)).not.toContain("2580");
  });

  it("uses a fresh salt, so the same PIN does not give the same record", async () => {
    const a = await createLockConfig("2580", 1);
    const b = await createLockConfig("2580", 1);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it("refuses, rather than throws, on a damaged record", async () => {
    expect(await verifyPin("2580", { salt: "%%%", hash: "%%%", iterations: 1000 })).toBe(false);
  });
});

describe("parseLockConfig: a damaged setting means no lock, never a lock for good", () => {
  it("reads what createLockConfig wrote", async () => {
    const config = await createLockConfig("2580", 15);
    expect(parseLockConfig(JSON.stringify(config))).toEqual(config);
  });

  it("is null for nothing, junk, the wrong shape or hand-edited values", async () => {
    const good = await createLockConfig("2580", 5);
    const cases: Array<string | null> = [
      null,
      "",
      "not json",
      "[]",
      "null",
      "42",
      JSON.stringify({}),
      JSON.stringify({ ...good, salt: 5 }),
      JSON.stringify({ ...good, salt: "not base64!" }),
      JSON.stringify({ ...good, hash: "" }),
      JSON.stringify({ ...good, iterations: 0 }),
      JSON.stringify({ ...good, iterations: 99_999_999 }),
      JSON.stringify({ ...good, iterations: 1.5 })
    ];
    for (const raw of cases) expect(parseLockConfig(raw), String(raw)).toBeNull();
  });

  it("falls back to the default for a delay that is not one of the choices", async () => {
    const good = await createLockConfig("2580", 5);
    expect(parseLockConfig(JSON.stringify({ ...good, idleMinutes: 0 }))?.idleMinutes).toBe(DEFAULT_IDLE_MINUTES);
    expect(parseLockConfig(JSON.stringify({ ...good, idleMinutes: "5" }))?.idleMinutes).toBe(DEFAULT_IDLE_MINUTES);
  });
});

describe("storage", () => {
  it("saves, loads and clears, and clearing also forgets the wrong guesses", async () => {
    const store = memoryStore();
    const config = await createLockConfig("2580", 5);
    expect(saveLockConfig(store, config)).toBe(true);
    expect(loadLockConfig(store)).toEqual(config);

    store.setItem(ATTEMPTS_KEY, JSON.stringify({ failures: 7, until: Date.now() + 60_000 }));
    clearLockConfig(store);
    expect(store.data.has(LOCK_KEY)).toBe(false);
    expect(store.data.has(ATTEMPTS_KEY)).toBe(false);
    expect(loadLockConfig(store)).toBeNull();
  });

  it("reports a browser that will not keep the setting, and survives one that throws", () => {
    const refusing: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      }
    };
    expect(saveLockConfig(refusing, { salt: "AA==", hash: "AA==", iterations: 1000, idleMinutes: 1 })).toBe(false);
    expect(loadLockConfig(refusing)).toBeNull();
    expect(() => clearLockConfig(refusing)).not.toThrow();
    expect(readLastActive(refusing)).toBeNull();
    expect(() => writeLastActive(refusing, 1)).not.toThrow();
    expect(() => clearLastActive(refusing)).not.toThrow();
  });
});

describe("wrong guesses", () => {
  it("allows a few, then asks for a wait that doubles to a ceiling", () => {
    expect(waitAfterFailures(0)).toBe(0);
    expect(waitAfterFailures(FREE_ATTEMPTS - 1)).toBe(0);
    expect(waitAfterFailures(FREE_ATTEMPTS)).toBe(30);
    expect(waitAfterFailures(FREE_ATTEMPTS + 1)).toBe(60);
    expect(waitAfterFailures(FREE_ATTEMPTS + 2)).toBe(120);
    expect(waitAfterFailures(FREE_ATTEMPTS + 30)).toBe(MAX_WAIT_SECONDS);
  });

  it("counts a wrong guess and says how long is left", () => {
    let attempts = parseAttempts(null);
    const now = 1_000_000;
    for (let i = 0; i < FREE_ATTEMPTS - 1; i += 1) {
      attempts = afterWrongPin(attempts, now);
      expect(remainingWait(attempts, now)).toBe(0);
    }
    attempts = afterWrongPin(attempts, now);
    expect(remainingWait(attempts, now)).toBe(30);
    expect(remainingWait(attempts, now + 10_000)).toBe(20);
    expect(remainingWait(attempts, now + 30_000)).toBe(0);
  });

  it("reads a damaged count as a clean slate", () => {
    for (const raw of [null, "", "nope", "[]", JSON.stringify({ failures: -3, until: "soon" })]) {
      expect(parseAttempts(raw), String(raw)).toEqual({ failures: 0, until: 0 });
    }
  });
});

describe("when the lock closes", () => {
  const minute = 60_000;

  it("stays open while the person is using the app", () => {
    expect(shouldLock({ lastActive: 1_000_000, now: 1_000_000 + 30_000, idleMinutes: 1 })).toBe(false);
  });

  it("closes once the delay has passed, to the second", () => {
    expect(shouldLock({ lastActive: 1_000_000, now: 1_000_000 + minute - 1, idleMinutes: 1 })).toBe(false);
    expect(shouldLock({ lastActive: 1_000_000, now: 1_000_000 + minute, idleMinutes: 1 })).toBe(true);
    expect(shouldLock({ lastActive: 1_000_000, now: 1_000_000 + 4 * minute, idleMinutes: 5 })).toBe(false);
    expect(shouldLock({ lastActive: 1_000_000, now: 1_000_000 + 5 * minute, idleMinutes: 5 })).toBe(true);
  });

  it("counts no record of use, as in a new tab or a relaunched app, as having been away", () => {
    expect(shouldLock({ lastActive: null, now: 5, idleMinutes: 15 })).toBe(true);
  });

  it("remembers the last use in session storage, and forgets it", () => {
    const store = memoryStore();
    expect(readLastActive(store)).toBeNull();
    writeLastActive(store, 123_456);
    expect(readLastActive(store)).toBe(123_456);
    clearLastActive(store);
    expect(readLastActive(store)).toBeNull();
  });
});
