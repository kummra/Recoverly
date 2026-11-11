"use client";

import { createContext, useContext } from "react";

import { DEFAULT_IDLE_MINUTES, type IdleMinutes } from "@/lib/app-lock";

/** What the PIN box is told after a try. */
export type UnlockResult =
  | { ok: true }
  | { ok: false; reason: "wrong" }
  | { ok: false; reason: "wait"; seconds: number };

export type AppLockValue = {
  /** The setting has been read from this device (it cannot be on the server). */
  ready: boolean;
  /** This browser can keep a lock at all. */
  supported: boolean;
  enabled: boolean;
  idleMinutes: IdleMinutes;
  /** Close the lock now, as when handing the phone to someone. */
  lockNow: () => void;
  unlock: (pin: string) => Promise<UnlockResult>;
  turnOn: (pin: string, idleMinutes: IdleMinutes) => Promise<boolean>;
  /** Needs the current PIN, so an unlocked, unattended phone cannot be used to remove it. */
  turnOff: (pin: string) => Promise<UnlockResult>;
  setIdleMinutes: (minutes: IdleMinutes) => void;
};

const NO_LOCK: AppLockValue = {
  ready: true,
  supported: false,
  enabled: false,
  idleMinutes: DEFAULT_IDLE_MINUTES,
  lockNow: () => undefined,
  unlock: async () => ({ ok: true }),
  turnOn: async () => false,
  turnOff: async () => ({ ok: true }),
  setIdleMinutes: () => undefined
};

export const AppLockContext = createContext<AppLockValue>(NO_LOCK);

/** Safe anywhere: outside the provider it reports "no lock". */
export function useAppLock(): AppLockValue {
  return useContext(AppLockContext);
}
