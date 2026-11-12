"use client";

import { useEffect, useState } from "react";

import type { Programme } from "@/lib/programme";
import { PROGRAMME_CHANGED_EVENT, loadProgramme, programmeStorageKey } from "@/lib/programme-membership";

/**
 * The programme this device has joined. Read after mount (storage does not
 * exist on the server, and reading it during the first render would make server
 * and browser markup differ), and kept in step with changes made in another tab
 * (the browser's `storage` event) and in this one (`PROGRAMME_CHANGED_EVENT`).
 */
export function useProgramme(userId: string | undefined) {
  const [programme, setProgramme] = useState<Programme | null>(null);

  useEffect(() => {
    setProgramme(userId ? loadProgramme(userId) : null);
    if (!userId) return;

    const key = programmeStorageKey(userId);
    const onStorage = (event: StorageEvent) => {
      // `key` is null when storage was cleared wholesale.
      if (event.key === key || event.key === null) setProgramme(loadProgramme(userId));
    };
    const onChange = () => setProgramme(loadProgramme(userId));
    window.addEventListener("storage", onStorage);
    window.addEventListener(PROGRAMME_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PROGRAMME_CHANGED_EVENT, onChange);
    };
  }, [userId]);

  return [programme, setProgramme] as const;
}
