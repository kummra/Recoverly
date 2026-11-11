"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { AppLockContext, type AppLockValue, type UnlockResult } from "@/components/app-lock-context";
import { LockScreen } from "@/components/lock-screen";
import { useAuth } from "@/hooks/use-auth";
import {
  ATTEMPTS_KEY,
  DEFAULT_IDLE_MINUTES,
  type IdleMinutes,
  type LockConfig,
  afterWrongPin,
  checkNewPin,
  clearLastActive,
  clearLockConfig,
  createLockConfig,
  loadLockConfig,
  lockSupported,
  parseAttempts,
  readLastActive,
  remainingWait,
  saveLockConfig,
  shouldLock,
  verifyPin,
  writeLastActive,
  LOCK_KEY
} from "@/lib/app-lock";

/** `useLayoutEffect` warns when rendered on the server, where it does nothing. */
const useBrowserLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** How often the page checks whether it has been idle long enough to lock. */
const CHECK_EVERY_MS = 5_000;
/** Recording every pointer move would be pointless work. */
const ACTIVITY_WRITE_EVERY_MS = 3_000;

/**
 * Decides whether to show the app or the PIN screen, and keeps the lock's
 * rules in one place. See `lib/app-lock.ts` for what the lock is and is not.
 *
 * Rules that must stay true:
 *  - It starts open on the server and on the first browser render, so server
 *    and browser agree, and closes before the first paint if it should be shut.
 *    No personal data is in the server's HTML, so nothing shows in between.
 *  - Locking removes the app from the page rather than covering it, so nothing
 *    is left behind the lock screen to read in the page source.
 *  - The lock only exists while someone is signed in. Signing out removes it,
 *    which is also the way out of a forgotten PIN.
 *  - If this browser cannot keep or check a lock, there is no lock. A lock that
 *    cannot be opened would lock someone out of their own recovery app.
 */
export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [supported, setSupported] = useState(false);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const configRef = useRef<LockConfig | null>(null);

  const applyConfig = useCallback((next: LockConfig | null) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  // Read the setting from this device, and close the lock before the first
  // paint if it should be closed (a new tab, a relaunched app, or too long away).
  useBrowserLayoutEffect(() => {
    const canLock = lockSupported();
    setSupported(canLock);
    const stored = canLock ? loadLockConfig(window.localStorage) : null;
    applyConfig(stored);
    if (stored && shouldLock({ lastActive: readLastActive(window.sessionStorage), now: Date.now(), idleMinutes: stored.idleMinutes })) {
      setLocked(true);
    }
    setReady(true);
  }, [applyConfig]);

  // Signing out removes the lock. `loading` matters: before the first answer
  // from the sign-in service there is no user yet, and that must not be read as
  // someone having signed out.
  useEffect(() => {
    if (loading || user || !configRef.current) return;
    clearLockConfig(window.localStorage);
    clearLastActive(window.sessionStorage);
    applyConfig(null);
    setLocked(false);
  }, [loading, user, applyConfig]);

  // While the app is open: note use, and close the lock after the chosen idle
  // time or time away.
  useEffect(() => {
    if (!config || locked) return;

    const check = () => {
      const current = configRef.current;
      if (!current) return;
      if (shouldLock({ lastActive: readLastActive(window.sessionStorage), now: Date.now(), idleMinutes: current.idleMinutes })) {
        setLocked(true);
      }
    };

    let lastWrite = 0;
    const touch = () => {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_WRITE_EVERY_MS) return;
      lastWrite = now;
      writeLastActive(window.sessionStorage, now);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Time away counts from the moment the app was left.
        writeLastActive(window.sessionStorage, Date.now());
      } else {
        check();
      }
    };
    const onLeave = () => writeLastActive(window.sessionStorage, Date.now());

    touch();
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    for (const name of events) window.addEventListener(name, touch, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    const timer = window.setInterval(check, CHECK_EVERY_MS);

    return () => {
      for (const name of events) window.removeEventListener(name, touch);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
      window.clearInterval(timer);
    };
  }, [config, locked]);

  // Another tab turned the lock on or off, or changed it.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCK_KEY && event.key !== null) return;
      const next = lockSupported() ? loadLockConfig(window.localStorage) : null;
      applyConfig(next);
      if (!next) setLocked(false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applyConfig]);

  /** Check a PIN, counting wrong guesses so the delay survives a page reload. */
  const verify = useCallback(async (pin: string): Promise<UnlockResult> => {
    const current = configRef.current;
    if (!current) return { ok: true };
    try {
      const attempts = parseAttempts(window.localStorage.getItem(ATTEMPTS_KEY));
      const waiting = remainingWait(attempts, Date.now());
      if (waiting > 0) return { ok: false, reason: "wait", seconds: waiting };

      if (await verifyPin(pin, current)) {
        window.localStorage.removeItem(ATTEMPTS_KEY);
        return { ok: true };
      }
      const next = afterWrongPin(attempts, Date.now());
      window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(next));
      const nowWaiting = remainingWait(next, Date.now());
      return nowWaiting > 0 ? { ok: false, reason: "wait", seconds: nowWaiting } : { ok: false, reason: "wrong" };
    } catch {
      return { ok: false, reason: "wrong" };
    }
  }, []);

  const lockNow = useCallback(() => {
    if (!configRef.current) return;
    // Forget recent use as well, so reloading the page does not undo it.
    clearLastActive(window.sessionStorage);
    setLocked(true);
  }, []);

  const unlock = useCallback(
    async (pin: string): Promise<UnlockResult> => {
      const result = await verify(pin);
      if (result.ok) {
        writeLastActive(window.sessionStorage, Date.now());
        setLocked(false);
      }
      return result;
    },
    [verify]
  );

  const turnOn = useCallback(
    async (pin: string, idleMinutes: IdleMinutes): Promise<boolean> => {
      if (checkNewPin(pin) !== null || !lockSupported()) return false;
      try {
        const next = await createLockConfig(pin, idleMinutes);
        if (!saveLockConfig(window.localStorage, next)) return false;
        window.localStorage.removeItem(ATTEMPTS_KEY);
        writeLastActive(window.sessionStorage, Date.now());
        applyConfig(next);
        return true;
      } catch {
        return false;
      }
    },
    [applyConfig]
  );

  const turnOff = useCallback(
    async (pin: string): Promise<UnlockResult> => {
      const result = await verify(pin);
      if (result.ok) {
        clearLockConfig(window.localStorage);
        clearLastActive(window.sessionStorage);
        applyConfig(null);
        setLocked(false);
      }
      return result;
    },
    [verify, applyConfig]
  );

  const setIdleMinutes = useCallback(
    (minutes: IdleMinutes) => {
      const current = configRef.current;
      if (!current) return;
      const next = { ...current, idleMinutes: minutes };
      if (saveLockConfig(window.localStorage, next)) applyConfig(next);
    },
    [applyConfig]
  );

  const value = useMemo<AppLockValue>(
    () => ({
      ready,
      supported,
      enabled: config !== null,
      idleMinutes: config?.idleMinutes ?? DEFAULT_IDLE_MINUTES,
      lockNow,
      unlock,
      turnOn,
      turnOff,
      setIdleMinutes
    }),
    [ready, supported, config, lockNow, unlock, turnOn, turnOff, setIdleMinutes]
  );

  return <AppLockContext.Provider value={value}>{locked ? <LockScreen /> : children}</AppLockContext.Provider>;
}
