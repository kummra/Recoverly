"use client";

import { useEffect, useState } from "react";

import { type SupportPerson, loadPerson, personStorageKey } from "@/lib/support-person";

/**
 * The saved person. Read after mount (storage does not exist on the server, and
 * reading it during the first render would make server and browser markup
 * differ), and kept in step with changes made in another tab.
 */
export function useSupportPerson(userId: string | undefined) {
  const [person, setPerson] = useState<SupportPerson | null>(null);

  useEffect(() => {
    setPerson(userId ? loadPerson(userId) : null);
    if (!userId) return;

    const key = personStorageKey(userId);
    const onStorage = (event: StorageEvent) => {
      // `key` is null when storage was cleared wholesale.
      if (event.key === key || event.key === null) setPerson(loadPerson(userId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  return [person, setPerson] as const;
}
