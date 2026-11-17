/**
 * The order a team sees the people who share with it: anyone who asked to be contacted first (most
 * recently updated first among them), then everyone else by most recent update. Pure, so it can be tested.
 */
import type { ShareSnapshot } from "@/lib/share";

export type BoardEntry = { id: string; snapshot: ShareSnapshot; updatedAt: number; expiresAt: number };

export function orderForBoard<T extends BoardEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => {
    const asked = Number(Boolean(b.snapshot.contact)) - Number(Boolean(a.snapshot.contact));
    return asked !== 0 ? asked : b.updatedAt - a.updatedAt;
  });
}
