/**
 * Who may use the paid organisation features. One question, answered in one place, from a stored
 * subscription record that the payment provider's webhooks (or the owner, for a manual invoice) keep current.
 *
 * Access stays on through a short grace period after a failed renewal, and it ends on its own if a renewal
 * is never confirmed, so a missed message can never leave a lapsed account open for good.
 */
import { type PlanId, isPlanId } from "@/lib/billing/catalogue";

export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "canceled", "unpaid", "incomplete", "incomplete_expired", "paused"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type Subscription = {
  /** `stripe`: kept current by webhooks. `manual`: the owner activated it after an invoice was paid, until `currentPeriodEnd`. */
  source: "stripe" | "manual";
  plan: PlanId;
  status: SubscriptionStatus;
  /** Milliseconds since the epoch, or `null` if unknown. */
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  customerId?: string;
  subscriptionId?: string;
  updatedAt: number;
  /** The provider event time (seconds) this record last reflected, so an older event cannot overwrite a newer one. */
  eventCreated?: number;
  note?: string;
};

export const DAY_MS = 24 * 60 * 60 * 1000;
/** After a failed payment, access continues this long past the period end. */
export const PAST_DUE_GRACE_DAYS = 7;
/** If no renewal has been confirmed this long after the period ended, access ends whatever the stored status says. */
export const STALE_GRACE_DAYS = 3;

export function normaliseStatus(value: unknown): SubscriptionStatus {
  return (SUBSCRIPTION_STATUSES as readonly unknown[]).includes(value) ? (value as SubscriptionStatus) : "incomplete";
}

export function hasAccess(subscription: Subscription | null | undefined, now: number): boolean {
  if (!subscription || !isPlanId(subscription.plan)) return false;
  const end = subscription.currentPeriodEnd;
  if (subscription.source === "manual") return subscription.status === "active" && end !== null && now < end;

  switch (subscription.status) {
    case "active":
    case "trialing":
      return end === null || now < end + STALE_GRACE_DAYS * DAY_MS;
    case "past_due":
      return end !== null && now < end + PAST_DUE_GRACE_DAYS * DAY_MS;
    default:
      return false;
  }
}

export type AccessSummary = { active: boolean; plan: PlanId | null; status: SubscriptionStatus | "none"; periodEnd: number | null; inGrace: boolean; cancelAtPeriodEnd: boolean; source: Subscription["source"] | null };

export function accessSummary(subscription: Subscription | null | undefined, now: number): AccessSummary {
  if (!subscription) return { active: false, plan: null, status: "none", periodEnd: null, inGrace: false, cancelAtPeriodEnd: false, source: null };
  const active = hasAccess(subscription, now);
  const inGrace = active && subscription.status === "past_due";
  return { active, plan: subscription.plan, status: subscription.status, periodEnd: subscription.currentPeriodEnd, inGrace, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd, source: subscription.source };
}
