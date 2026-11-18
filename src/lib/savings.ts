/**
 * A rough, honest estimate of money not spent: how much less the person has logged so far this month than in
 * the whole of last month, at a price they typed. It is a device-only convenience built from their own logs,
 * never a promise, and it says nothing when they have logged as much or more.
 */
export const MAX_PRICE_PER_100ML = 5000;

export function parsePrice(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100) / 100, MAX_PRICE_PER_100ML) : 0;
}

export type Saving = { lessMl: number; amount: number };

export function estimateSaving(previousMonthMl: number, monthMl: number, pricePer100Ml: number): Saving | null {
  const price = parsePrice(pricePer100Ml);
  const less = Math.round(previousMonthMl - monthMl);
  if (price <= 0 || less <= 0) return null;
  return { lessMl: less, amount: Math.round((less / 100) * price) };
}

export const priceStorageKey = (userId: string) => `recoverly:price:${userId}`;

export function loadPrice(userId: string): number {
  try {
    return parsePrice(window.localStorage.getItem(priceStorageKey(userId)));
  } catch {
    return 0;
  }
}

export function savePrice(userId: string, price: number): boolean {
  try {
    const clean = parsePrice(price);
    if (clean > 0) window.localStorage.setItem(priceStorageKey(userId), String(clean));
    else window.localStorage.removeItem(priceStorageKey(userId));
    return true;
  } catch {
    return false;
  }
}

export function clearPrice(userId: string): void {
  try {
    window.localStorage.removeItem(priceStorageKey(userId));
  } catch {
    /* nothing stored */
  }
}
