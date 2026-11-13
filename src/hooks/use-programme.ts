"use client";

import { useEffect, useState } from "react";

import type { Programme } from "@/lib/programme";
import { PROGRAMME_CHANGED_EVENT, loadMembership, programmeStorageKey } from "@/lib/programme-membership";

/**
 * The programme this device has joined, and whether the person chose to be counted
 * in its anonymous monthly total (third value; false unless they ticked the box).
 * Read after mount (storage does not exist on the server, and reading it during the
 * first render would make server and browser markup differ), and kept in step with
 * changes made in another tab (the browser's `storage` event) and in this one
 * (`PROGRAMME_CHANGED_EVENT`).
 */
export function useProgramme(userId: string | undefined) {
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [counted, setCounted] = useState(false);

  useEffect(() => {
    const read = () => {
      const membership = userId ? loadMembership(userId) : null;
      setProgramme(membership?.programme ?? null);
      setCounted(membership?.counted ?? false);
    };
    read();
    if (!userId) return;

    const key = programmeStorageKey(userId);
    const onStorage = (event: StorageEvent) => {
      // `key` is null when storage was cleared wholesale.
      if (event.key === key || event.key === null) read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PROGRAMME_CHANGED_EVENT, read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PROGRAMME_CHANGED_EVENT, read);
    };
  }, [userId]);

  return [programme, setProgramme, counted] as const;
}
