/**
 * Taking payment and keeping the account's subscription true: Checkout, the customer portal, confirming a
 * payment when the person returns, and the provider's webhooks. Server only.
 *
 * What makes it safe to get wrong less often:
 *  - Access is never granted from a redirect alone. The return page asks Stripe (with our key) whether that
 *    exact session is complete and belongs to this account (`confirm`), and webhooks (`handleEvent`) keep the
 *    record current afterwards. Both go through one function (`applySubscription`) with the same guards.
 *  - Events can arrive twice or out of order. Each is remembered by id; an event older than what is stored is
 *    ignored; a stale event about an older subscription cannot close a newer one; a stale card event cannot
 *    wipe a manual activation.
 *  - Prices live in Stripe and are named by environment variables, never in the code.
 *  - A failure from Stripe is shown to the person as a plain sentence; only a status and code are logged.
 */
import { PLANS, PLAN_IDS, PRODUCTS, type PlanId, isPlanId, planFitsKind, priceIdFromEnv } from "@/lib/billing/catalogue";
import { type AccessSummary, type Subscription, accessSummary, hasAccess } from "@/lib/billing/entitlement";
import {
  type PriceDisplay,
  type StripeConfig,
  StripeError,
  type StripeEvent,
  type SubscriptionUpdate,
  createCheckoutSession,
  createPortalSession,
  idOf,
  retrieveCheckoutSession,
  retrievePrice,
  retrieveSubscription,
  subscriptionFromObject
} from "@/lib/billing/stripe";
import { OrgError } from "@/lib/org/errors";
import { ORG_LIMITS, type OrgRecord } from "@/lib/org/model";
import type { OrgStore } from "@/lib/org/store";

type Env = Record<string, string | undefined>;

const NOT_SET_UP = "Online payment is not set up for this yet. Contact us and we will send an invoice instead.";
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;

/** Which plan a price belongs to, by the environment variable that names it. Used when a plan is switched in the customer portal. */
export function planForPriceId(priceId: string | undefined, env: Env): PlanId | null {
  if (!priceId) return null;
  return PLAN_IDS.find((id) => priceIdFromEnv(PLANS[id].priceEnv, env) === priceId) ?? null;
}

const priceCache = new Map<string, { at: number; value: PriceDisplay | null }>();
const PRICE_TTL_MS = 10 * 60 * 1000;
const PRICE_MISS_TTL_MS = 60 * 1000;
export const clearPriceCache = () => priceCache.clear();

export type BillingOutcome = "applied" | "ignored" | "duplicate";

export type BillingDeps = { store: OrgStore; stripe: StripeConfig | null; baseUrl: string; now?: () => number; env?: Env };

export function createBillingService(deps: BillingDeps) {
  const { store, stripe, baseUrl } = deps;
  const now = deps.now ?? Date.now;
  const env: Env = deps.env ?? process.env;

  /** Run a Stripe call and turn its failure into a sentence for the person. */
  async function viaStripe<T>(action: string, run: (config: StripeConfig) => Promise<T>): Promise<T> {
    if (!stripe) throw new OrgError("unavailable", NOT_SET_UP);
    try {
      return await run(stripe);
    } catch (error) {
      if (error instanceof StripeError) {
        // eslint-disable-next-line no-console
        console.error(`[billing] ${action} failed: status ${error.status}${error.code ? `, ${error.code}` : ""}`);
        throw new OrgError("unavailable", "Stripe could not complete that just now. Please try again in a moment, or contact us.");
      }
      throw error;
    }
  }

  /** Make the account's subscription match what Stripe says. Returns whether anything changed. */
  async function applySubscription(orgId: string, update: SubscriptionUpdate, eventSeconds: number): Promise<boolean> {
    const at = now();
    const named = planForPriceId(update.priceId, env) ?? (isPlanId(update.item) ? update.item : null);
    const live = update.status === "active" || update.status === "trialing";
    let applied = false;
    await store.updateOrg(orgId, (current) => {
      if (!current) return null;
      const held = current.subscription;
      if (held?.eventCreated !== undefined && eventSeconds < held.eventCreated) return null;
      if (held?.source === "manual" && hasAccess(held, at) && !live) return null;
      if (held?.source === "stripe" && held.subscriptionId && held.subscriptionId !== update.subscriptionId && hasAccess(held, at) && !live) return null;
      const plan = named ?? (held?.source === "stripe" ? held.plan : null);
      if (!plan || !planFitsKind(plan, current.kind)) return null;
      const next: Subscription = {
        source: "stripe",
        plan,
        status: update.status,
        currentPeriodEnd: update.currentPeriodEnd,
        cancelAtPeriodEnd: update.cancelAtPeriodEnd,
        customerId: update.customerId,
        subscriptionId: update.subscriptionId,
        updatedAt: at,
        eventCreated: eventSeconds
      };
      applied = true;
      return { ...current, subscription: next, updatedAt: at };
    });
    return applied;
  }

  async function recordPurchase(orgId: string, item: string, ref: string): Promise<boolean> {
    let recorded = false;
    await store.updateOrg(orgId, (org) => {
      if (!org || org.purchases.some((purchase) => purchase.ref === ref)) return null;
      recorded = true;
      return { ...org, purchases: [...org.purchases, { item, at: now(), ref }].slice(-ORG_LIMITS.purchasesMax), updatedAt: now() };
    });
    return recorded;
  }

  /** A finished Checkout session, from a webhook or from the person coming back: apply what it bought. */
  async function settleSession(org: OrgRecord, session: Record<string, unknown>, eventSeconds: number): Promise<boolean> {
    const metadata = (session.metadata ?? {}) as Record<string, unknown>;
    if (session.mode === "subscription") {
      const subscriptionId = idOf(session.subscription);
      if (!subscriptionId || !stripe) return false;
      const data = await viaStripe("read subscription", (config) => retrieveSubscription(config, subscriptionId));
      const update = subscriptionFromObject(data);
      if (!update) return false;
      return applySubscription(org.id, { ...update, item: update.item ?? (typeof metadata.item === "string" ? metadata.item : undefined) }, eventSeconds);
    }
    if (session.mode === "payment" && session.payment_status === "paid") {
      const item = typeof metadata.item === "string" ? metadata.item : "";
      const known = PRODUCTS.some((product) => product.id === item);
      return known && typeof session.id === "string" ? recordPurchase(org.id, item, session.id) : false;
    }
    return false;
  }

  async function orgFor(update: SubscriptionUpdate): Promise<OrgRecord | null> {
    if (update.orgId) {
      const byNote = await store.getOrg(update.orgId);
      if (byNote) return byNote;
    }
    return store.orgByCustomerId(update.customerId);
  }

  async function priceFor(envName: string): Promise<PriceDisplay | null> {
    const priceId = priceIdFromEnv(envName, env);
    if (!priceId || !stripe) return null;
    const cached = priceCache.get(priceId);
    if (cached && now() - cached.at < (cached.value ? PRICE_TTL_MS : PRICE_MISS_TTL_MS)) return cached.value;
    let value: PriceDisplay | null = null;
    try {
      value = await retrievePrice(stripe, priceId);
    } catch {
      value = null;
    }
    priceCache.set(priceId, { at: now(), value });
    return value;
  }

  return {
    /** What each plan and service costs, as Stripe has it; `null` for one that is not set up (the page then says to ask us). */
    async prices(): Promise<Record<string, PriceDisplay | null>> {
      const entries: Array<[string, string]> = [...PLAN_IDS.map((id): [string, string] => [id, PLANS[id].priceEnv]), ...PRODUCTS.map((product): [string, string] => [product.id, product.priceEnv])];
      const result: Record<string, PriceDisplay | null> = {};
      await Promise.all(entries.map(async ([id, envName]) => (result[id] = await priceFor(envName))));
      return result;
    },

    /** A Stripe Checkout address for a plan (a subscription) or a one-off service. */
    async checkout(uid: string, input: { plan?: unknown; product?: unknown }): Promise<{ url: string }> {
      const org = await store.getOrg(uid);
      if (!org) throw new OrgError("not_found", "Create your organisation first.");
      if (!stripe) throw new OrgError("unavailable", NOT_SET_UP);
      const common = {
        orgId: uid,
        customerId: org.subscription?.customerId,
        email: org.contactEmail ?? undefined,
        successUrl: `${baseUrl}/portal?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/portal?checkout=cancelled`
      };

      if (input.plan !== undefined) {
        const plan = input.plan;
        if (!isPlanId(plan) || !planFitsKind(plan, org.kind)) throw new OrgError("invalid", "That plan is not available for your kind of organisation.");
        const held = org.subscription;
        if (held?.source === "stripe" && hasAccess(held, now())) throw new OrgError("conflict", "You already have an active subscription. Use Manage billing to change or cancel it.");
        const priceId = priceIdFromEnv(PLANS[plan].priceEnv, env);
        if (!priceId) throw new OrgError("unavailable", NOT_SET_UP);
        const session = await viaStripe("start checkout", (config) => createCheckoutSession(config, { mode: "subscription", priceId, item: plan, ...common }));
        return { url: session.url };
      }

      const product = PRODUCTS.find((candidate) => candidate.id === input.product);
      if (!product) throw new OrgError("invalid", "Choose what to buy.");
      const priceId = priceIdFromEnv(product.priceEnv, env);
      if (!priceId) throw new OrgError("unavailable", NOT_SET_UP);
      const session = await viaStripe("start checkout", (config) => createCheckoutSession(config, { mode: "payment", priceId, item: product.id, ...common }));
      return { url: session.url };
    },

    /** Stripe's own page for changing the card, switching plan, getting invoices or cancelling. */
    async portal(uid: string): Promise<{ url: string }> {
      const org = await store.getOrg(uid);
      if (!org) throw new OrgError("not_found", "Create your organisation first.");
      const customerId = org.subscription?.customerId;
      if (!customerId) throw new OrgError("invalid", "There is no card subscription to manage. If you pay by invoice, contact us.");
      const session = await viaStripe("open portal", (config) => createPortalSession(config, { customerId, returnUrl: `${baseUrl}/portal` }));
      return { url: session.url };
    },

    /**
     * The person has come back from Stripe's page. Ask Stripe about that exact session and, if it is complete and
     * ours, apply it now, so the account opens without waiting for the webhook.
     */
    async confirm(uid: string, sessionId: unknown): Promise<AccessSummary> {
      if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId)) throw new OrgError("invalid", "That is not a payment session.");
      const org = await store.getOrg(uid);
      if (!org) throw new OrgError("not_found", "Create your organisation first.");
      const session = await viaStripe("read checkout session", (config) => retrieveCheckoutSession(config, sessionId));
      if (session.client_reference_id !== uid) throw new OrgError("forbidden", "That payment belongs to another account.");
      if (session.status === "complete") await settleSession(org, session, Math.floor(now() / 1000));
      return accessSummary((await store.getOrg(uid))?.subscription ?? null, now());
    },

    /** One verified Stripe event. Throws if it could not be handled, so Stripe sends it again. */
    async handleEvent(event: StripeEvent): Promise<BillingOutcome> {
      if (await store.eventSeen(event.id)) return "duplicate";
      let outcome: BillingOutcome = "ignored";

      if (event.type === "checkout.session.completed") {
        const orgId = typeof event.object.client_reference_id === "string" ? event.object.client_reference_id : null;
        const org = orgId ? await store.getOrg(orgId) : null;
        if (org && (await settleSession(org, event.object, event.created))) outcome = "applied";
      } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        const update = subscriptionFromObject(event.object, event.type === "customer.subscription.deleted");
        const org = update ? await orgFor(update) : null;
        if (update && org && (await applySubscription(org.id, update, event.created))) outcome = "applied";
      } else {
        return "ignored";
      }

      await store.markEvent(event.id, event.created, event.type);
      return outcome;
    }
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
