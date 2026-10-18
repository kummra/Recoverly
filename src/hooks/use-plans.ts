"use client";

import { useEffect, useState } from "react";

import { type Plan, loadPlans, planStorageKey } from "@/lib/plans";

/**
 * The person's saved plans. Read after mount: storage does not exist on the
 * server, and reading it during the first render would make server and client
 * markup differ. Also follows changes made in another tab, so a plan saved in
 * one is not missing from the craving screen open in another.
 */
export function usePlans(userId: string | undefined) {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    setPlans(userId ? loadPlans(userId) : []);
    if (!userId) return;

    const key = planStorageKey(userId);
    const onStorage = (event: StorageEvent) => {
      // `key` is null when storage was cleared wholesale.
      if (event.key === key || event.key === null) setPlans(loadPlans(userId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  return [plans, setPlans] as const;
}
