/**
 * Copying a programme's ready-made plans into the person's own plans (`lib/plans.ts`), on their
 * device only. It is the person's act, off unless ticked, and nothing about it is sent anywhere:
 * the organisation is not told whether they added them.
 */
import { type Plan, MAX_PLANS, updatePlans } from "@/lib/plans";
import type { Programme } from "@/lib/programme";

const same = (a: { when: string; then: string }, b: { when: string; then: string }) => a.when.toLowerCase() === b.when.toLowerCase() && a.then.toLowerCase() === b.then.toLowerCase();

export function newPlanId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** The plans to append: the programme's own, minus any the person already has, as many as fit under the limit. Pure. */
export function plansToAdd(current: readonly Plan[], programme: Pick<Programme, "plans">, newId: () => string): Plan[] {
  const room = Math.max(0, MAX_PLANS - current.length);
  const fresh = (programme.plans ?? []).filter((plan) => !current.some((own) => same(own, plan)));
  return fresh.slice(0, room).map((plan) => ({ id: newId(), when: plan.when, then: plan.then }));
}

/** Add them to what is in storage now. `ok` is false only if the browser refused to store; `added` is how many were new. */
export function addProgrammePlans(userId: string, programme: Pick<Programme, "plans">, newId: () => string): { ok: boolean; added: number } {
  let added = 0;
  const result = updatePlans(userId, (current) => {
    const extra = plansToAdd(current, programme, newId);
    added = extra.length;
    return extra.length ? [...current, ...extra] : null;
  });
  return { ok: result.ok, added: result.ok ? added : 0 };
}
