/**
 * "If this happens, I will do that" — a plan made in a calm moment, shown in
 * a hard one.
 *
 * This is an implementation intention, one of the better-supported techniques
 * in behaviour change: deciding the response in advance means nothing has to
 * be decided mid-craving. The app already notices WHEN a person's hard windows
 * tend to fall; this gives them something of their own to meet it with, rather
 * than a generic prompt.
 *
 * Plans never leave the device. They are free text about someone's cravings
 * and the people in their life, which is exactly what should not sit on a
 * server, in a database mirror or in a prompt to a model. The cost is that
 * they do not follow the person to a new phone, and the editor says so.
 * Everything here is defensive about storage: it can be absent, full, blocked
 * or hand-edited, and none of that may break the dashboard.
 */

export type Plan = {
  id: string;
  /** The situation: "I feel stressed after work". */
  when: string;
  /** The response: "I take a ten minute walk and call my sister". */
  then: string;
};

export const MAX_PLANS = 3;
export const MAX_PLAN_TEXT = 120;

export function planStorageKey(userId: string): string {
  return `recoverly:plans:${userId}`;
}

/** Collapse whitespace and cut to length; empty in, empty out. */
function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_PLAN_TEXT);
}

/** Read whatever is in storage and keep only what is a well-formed plan. A
 *  corrupt entry is dropped rather than thrown on. */
export function parsePlans(raw: string | null): Plan[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const plans: Plan[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const { id, when, then } = item as Record<string, unknown>;
    const w = clean(when);
    const t = clean(then);
    if (typeof id !== "string" || !id || seen.has(id) || !w || !t) continue;
    seen.add(id);
    plans.push({ id, when: w, then: t });
    if (plans.length === MAX_PLANS) break;
  }
  return plans;
}

/** `null` when the input is not a usable plan (either half empty). */
export function normalisePlanInput(input: { when: string; then: string }): { when: string; then: string } | null {
  const when = clean(input.when);
  const then = clean(input.then);
  return when && then ? { when, then } : null;
}

/** The list with one more plan, or `null` if it is full or the input is empty. */
export function addPlan(plans: Plan[], input: { when: string; then: string }, id: string): Plan[] | null {
  const ok = normalisePlanInput(input);
  if (!ok || plans.length >= MAX_PLANS) return null;
  return [...plans, { id, ...ok }];
}

export function removePlan(plans: Plan[], id: string): Plan[] {
  return plans.filter((p) => p.id !== id);
}

export function loadPlans(userId: string): Plan[] {
  try {
    return parsePlans(window.localStorage.getItem(planStorageKey(userId)));
  } catch {
    return [];
  }
}

/**
 * Change the plans by reading what is in storage at this moment, applying the
 * change, and writing it back. Used instead of writing a list that was read
 * when the page loaded: with two tabs open, the second tab's stale list would
 * otherwise silently overwrite whatever the first one saved. `change` returns
 * the new list, or `null` to make no change. `ok` is false when the browser
 * refused the write; `plans` is always what is actually stored afterwards.
 */
export function updatePlans(
  userId: string,
  change: (current: Plan[]) => Plan[] | null
): { ok: boolean; plans: Plan[] } {
  const current = loadPlans(userId);
  const next = change(current);
  if (next === null) return { ok: true, plans: current };
  return savePlans(userId, next) ? { ok: true, plans: next } : { ok: false, plans: current };
}

/** Forget this person's plans. Called when they delete their account: plans
 *  never reach the server, so the server-side deletion cannot remove them, and
 *  "delete my data" that left their cravings and family in the browser would
 *  not be true. Never throws. */
export function clearPlans(userId: string): void {
  try {
    window.localStorage.removeItem(planStorageKey(userId));
  } catch {
    /* nothing stored, or storage unavailable: either way there is nothing to remove */
  }
}

/** False when the browser refused to store it, so the caller can say so. */
export function savePlans(userId: string, plans: Plan[]): boolean {
  try {
    window.localStorage.setItem(planStorageKey(userId), JSON.stringify(plans));
    return true;
  } catch {
    return false;
  }
}
