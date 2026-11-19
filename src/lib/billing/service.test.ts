import { beforeEach, describe, expect, it, vi } from "vitest";

import { DAY_MS, type Subscription } from "@/lib/billing/entitlement";
import { clearPriceCache, createBillingService, planForPriceId } from "@/lib/billing/service";
import type { StripeEvent } from "@/lib/billing/stripe";
import { OrgError } from "@/lib/org/errors";
import { memoryOrgStore } from "@/lib/org/memory-store";
import type { OrgRecord } from "@/lib/org/model";

const NOW = 1_800_000_000_000;
const SECONDS = NOW / 1000;
const ENV = { STRIPE_PRICE_CLINIC: "price_clinic1", STRIPE_PRICE_WORKPLACE: "price_work1", STRIPE_PRICE_NETWORK: "price_net1", STRIPE_PRICE_WORKSHOP: "price_ws1" };

const org = (over: Partial<OrgRecord> = {}): OrgRecord => ({
  id: "u1",
  name: "Acme",
  kind: "workplace",
  contactEmail: "owner@acme.example",
  kindVerified: false,
  createdAt: 1,
  updatedAt: 1,
  termsAcceptedAt: 1,
  termsVersion: "2026-11",
  subscription: null,
  purchases: [],
  ...over
});

const stripeSub = (over: Partial<Subscription> = {}): Subscription => ({ source: "stripe", plan: "workplace", status: "active", currentPeriodEnd: NOW + 20 * DAY_MS, cancelAtPeriodEnd: false, updatedAt: 1, customerId: "cus_1", subscriptionId: "sub_1", eventCreated: SECONDS - 1000, ...over });

/** A fetch that answers like Stripe for the few calls the service makes, and remembers what it was asked. */
function fakeStripe(routes: Record<string, unknown> = {}) {
  const calls: Array<{ url: string; method: string; body: string }> = [];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET", body: String(init?.body ?? "") });
    const path = url.replace("https://api.stripe.com/v1", "");
    const hit = Object.entries(routes).find(([route]) => path.startsWith(route));
    if (!hit) return new Response(JSON.stringify({ error: { message: "No such thing", code: "resource_missing" } }), { status: 404 });
    return new Response(JSON.stringify(hit[1]), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  return { config: { secretKey: "sk_test_x", fetchImpl: fetchImpl as unknown as typeof fetch }, calls };
}

function setup(options: { stripe?: ReturnType<typeof fakeStripe> | null; env?: Record<string, string | undefined>; now?: number } = {}) {
  const store = memoryOrgStore();
  const stripe = options.stripe === undefined ? fakeStripe() : options.stripe;
  const service = createBillingService({ store, stripe: stripe ? stripe.config : null, baseUrl: "https://example.test", now: () => options.now ?? NOW, env: options.env ?? ENV });
  return { store, service, stripe };
}

const event = (type: string, object: Record<string, unknown>, over: Partial<StripeEvent> = {}): StripeEvent => ({ id: `evt_${Math.random().toString(36).slice(2)}`, type, created: SECONDS, object, ...over });
const subObject = (over: Record<string, unknown> = {}) => ({ id: "sub_1", customer: "cus_1", status: "active", current_period_end: SECONDS + 30 * 86400, cancel_at_period_end: false, items: { data: [{ price: { id: "price_work1" } }] }, metadata: { orgId: "u1", item: "workplace" }, ...over });

beforeEach(() => clearPriceCache());

const refused = async (promise: Promise<unknown>, code: string, text?: RegExp) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(OrgError);
  expect((error as OrgError).code).toBe(code);
  if (text) expect((error as OrgError).message).toMatch(text);
};

describe("which plan a price is", () => {
  it("is found by the environment variable that names it", () => {
    expect(planForPriceId("price_net1", ENV)).toBe("network");
    expect(planForPriceId("price_other", ENV)).toBeNull();
    expect(planForPriceId(undefined, ENV)).toBeNull();
  });
});

describe("starting a payment", () => {
  it("needs an organisation, a payment account and a price that has been set up, and says so plainly", async () => {
    const none = setup();
    await refused(none.service.checkout("u1", { plan: "workplace" }), "not_found");
    const noStripe = setup({ stripe: null });
    await noStripe.store.createOrg(org());
    await refused(noStripe.service.checkout("u1", { plan: "workplace" }), "unavailable", /not set up/);
    const noPrice = setup({ env: {} });
    await noPrice.store.createOrg(org());
    await refused(noPrice.service.checkout("u1", { plan: "workplace" }), "unavailable", /invoice/);
  });

  it("offers an organisation only the plans that fit its kind", async () => {
    const { service, store } = setup();
    await store.createOrg(org({ kind: "college" }));
    await refused(service.checkout("u1", { plan: "clinic" }), "invalid", /not available for your kind/);
    await refused(service.checkout("u1", { plan: "platinum" }), "invalid");
    await refused(service.checkout("u1", {}), "invalid", /what to buy/);
  });

  it("makes a subscription checkout that records the organisation, returning the address Stripe gives", async () => {
    const stripe = fakeStripe({ "/checkout/sessions": { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" } });
    const { service, store } = setup({ stripe });
    await store.createOrg(org());
    expect(await service.checkout("u1", { plan: "workplace" })).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    const body = decodeURIComponent(stripe.calls[0].body);
    expect(body).toContain("mode=subscription");
    expect(body).toContain("line_items[0][price]=price_work1");
    expect(body).toContain("client_reference_id=u1");
    expect(body).toContain("subscription_data[metadata][item]=workplace");
    expect(body).toContain("success_url=https://example.test/portal?checkout=success&session_id={CHECKOUT_SESSION_ID}");
    expect(body).toContain("cancel_url=https://example.test/portal?checkout=cancelled");
  });

  it("will not start a second subscription on top of an active card one, but lets a manual plan move to card", async () => {
    const stripe = fakeStripe({ "/checkout/sessions": { id: "cs_test_1", url: "https://checkout.stripe.com/x" } });
    const { service, store } = setup({ stripe });
    await store.createOrg(org({ subscription: stripeSub() }));
    await refused(service.checkout("u1", { plan: "workplace" }), "conflict", /Manage billing/);
    await store.updateOrg("u1", (o) => (o ? { ...o, subscription: { source: "manual", plan: "workplace", status: "active", currentPeriodEnd: NOW + DAY_MS, cancelAtPeriodEnd: false, updatedAt: 1 } } : null));
    await expect(service.checkout("u1", { plan: "workplace" })).resolves.toBeTruthy();
  });

  it("starts a one-off service as a single payment and reuses the customer Stripe already knows", async () => {
    const stripe = fakeStripe({ "/checkout/sessions": { id: "cs_test_2", url: "https://checkout.stripe.com/y" } });
    const { service, store } = setup({ stripe });
    await store.createOrg(org({ subscription: stripeSub({ status: "canceled" }) }));
    await service.checkout("u1", { product: "workshop" });
    const body = decodeURIComponent(stripe.calls[0].body);
    expect(body).toContain("mode=payment");
    expect(body).toContain("line_items[0][price]=price_ws1");
    expect(body).toContain("customer=cus_1");
    expect(body).not.toContain("subscription_data");
    await refused(service.checkout("u1", { product: "unicorn" }), "invalid");
  });

  it("shows a refusal from Stripe as a plain sentence and never repeats Stripe's own wording", async () => {
    const { service, store } = setup({ stripe: fakeStripe({}) });
    await store.createOrg(org());
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await refused(service.checkout("u1", { plan: "workplace" }), "unavailable", /Stripe could not complete that/);
    expect(spy.mock.calls.flat().join(" ")).not.toContain("No such thing");
    spy.mockRestore();
  });
});

describe("the customer portal", () => {
  it("opens for an account Stripe knows and says what to do for one it does not", async () => {
    const stripe = fakeStripe({ "/billing_portal/sessions": { url: "https://billing.stripe.com/p/x" } });
    const { service, store } = setup({ stripe });
    await store.createOrg(org());
    await refused(service.portal("u1"), "invalid", /invoice/);
    await store.updateOrg("u1", (o) => (o ? { ...o, subscription: stripeSub() } : null));
    expect(await service.portal("u1")).toEqual({ url: "https://billing.stripe.com/p/x" });
    expect(stripe.calls[0].body).toBe("customer=cus_1&return_url=https%3A%2F%2Fexample.test%2Fportal");
    await refused(service.portal("nobody"), "not_found");
  });
});

describe("confirming a payment on the way back", () => {
  const completed = { id: "cs_test_9", status: "complete", mode: "subscription", client_reference_id: "u1", subscription: "sub_1", metadata: { orgId: "u1", item: "workplace" } };

  it("turns the account on from Stripe's own answer, not from the address alone", async () => {
    const stripe = fakeStripe({ "/checkout/sessions/cs_test_9": completed, "/subscriptions/sub_1": subObject() });
    const { service, store } = setup({ stripe });
    await store.createOrg(org());
    const access = await service.confirm("u1", "cs_test_9");
    expect(access).toMatchObject({ active: true, plan: "workplace", status: "active" });
    expect((await store.getOrg("u1"))?.subscription).toMatchObject({ source: "stripe", customerId: "cus_1", subscriptionId: "sub_1", eventCreated: SECONDS });
  });

  it("refuses a malformed id, another account's session, and changes nothing for a session that is not complete", async () => {
    const stripe = fakeStripe({ "/checkout/sessions/cs_test_9": completed, "/checkout/sessions/cs_test_8": { ...completed, status: "open" }, "/checkout/sessions/cs_test_7": { ...completed, client_reference_id: "someone-else" }, "/subscriptions/sub_1": subObject() });
    const { service, store } = setup({ stripe });
    await store.createOrg(org());
    await refused(service.confirm("u1", "../../etc"), "invalid");
    await refused(service.confirm("u1", 5), "invalid");
    await refused(service.confirm("u1", "cs_test_7"), "forbidden");
    expect(await service.confirm("u1", "cs_test_8")).toMatchObject({ active: false });
    expect((await store.getOrg("u1"))?.subscription).toBeNull();
  });
});

describe("Stripe's events", () => {
  it("open the account when a subscription is created, finding it by the note we left on it", async () => {
    const { service, store } = setup();
    await store.createOrg(org());
    expect(await service.handleEvent(event("customer.subscription.created", subObject()))).toBe("applied");
    expect((await store.getOrg("u1"))?.subscription).toMatchObject({ plan: "workplace", status: "active", customerId: "cus_1" });
  });

  it("find the account by its Stripe customer when there is no note, and take the plan from the price (a switch in the portal changes only the price)", async () => {
    const { service, store } = setup();
    await store.createOrg(org({ kind: "community", subscription: stripeSub({ plan: "clinic", customerId: "cus_1" }) }));
    const switched = subObject({ metadata: {}, items: { data: [{ price: { id: "price_net1" } }] } });
    expect(await service.handleEvent(event("customer.subscription.updated", switched))).toBe("applied");
    expect((await store.getOrg("u1"))?.subscription?.plan).toBe("network");
  });

  it("handle each event once", async () => {
    const { service, store } = setup();
    await store.createOrg(org());
    const e = event("customer.subscription.created", subObject());
    expect(await service.handleEvent(e)).toBe("applied");
    expect(await service.handleEvent(e)).toBe("duplicate");
  });

  it("ignore an event older than the one already applied, so a late retry cannot undo a newer change", async () => {
    const { service, store } = setup();
    await store.createOrg(org());
    await service.handleEvent(event("customer.subscription.updated", subObject({ status: "past_due" }), { created: SECONDS }));
    expect(await service.handleEvent(event("customer.subscription.updated", subObject({ status: "active" }), { created: SECONDS - 500 }))).toBe("ignored");
    expect((await store.getOrg("u1"))?.subscription?.status).toBe("past_due");
    expect(await service.handleEvent(event("customer.subscription.updated", subObject({ status: "active" }), { created: SECONDS + 5 }))).toBe("applied");
    expect((await store.getOrg("u1"))?.subscription?.status).toBe("active");
  });

  it("close the account when the subscription is deleted", async () => {
    const { service, store } = setup();
    await store.createOrg(org({ subscription: stripeSub() }));
    await service.handleEvent(event("customer.subscription.deleted", subObject()));
    expect((await store.getOrg("u1"))?.subscription?.status).toBe("canceled");
  });

  it("do not let the end of an old subscription close a newer one", async () => {
    const { service, store } = setup();
    await store.createOrg(org({ subscription: stripeSub({ subscriptionId: "sub_NEW", eventCreated: SECONDS - 10 }) }));
    await service.handleEvent(event("customer.subscription.deleted", subObject({ id: "sub_OLD" })));
    expect((await store.getOrg("u1"))?.subscription).toMatchObject({ subscriptionId: "sub_NEW", status: "active" });
  });

  it("do not let a stale card event wipe a manual activation, but let a new live subscription replace it", async () => {
    const { service, store } = setup();
    await store.createOrg(org({ subscription: { source: "manual", plan: "workplace", status: "active", currentPeriodEnd: NOW + 30 * DAY_MS, cancelAtPeriodEnd: false, updatedAt: 1 } }));
    await service.handleEvent(event("customer.subscription.deleted", subObject({ id: "sub_ancient" })));
    expect((await store.getOrg("u1"))?.subscription?.source).toBe("manual");
    await service.handleEvent(event("customer.subscription.created", subObject({ id: "sub_fresh" })));
    expect((await store.getOrg("u1"))?.subscription).toMatchObject({ source: "stripe", subscriptionId: "sub_fresh" });
  });

  it("ignore a subscription for an account that does not exist, or a plan that does not fit the account's kind", async () => {
    const { service, store } = setup();
    expect(await service.handleEvent(event("customer.subscription.created", subObject()))).toBe("ignored");
    await store.createOrg(org({ kind: "college" }));
    const clinicPlan = subObject({ items: { data: [{ price: { id: "price_clinic1" } }] }, metadata: { orgId: "u1", item: "clinic" } });
    expect(await service.handleEvent(event("customer.subscription.created", clinicPlan))).toBe("ignored");
    expect((await store.getOrg("u1"))?.subscription).toBeNull();
  });

  it("record a one-off purchase once, and read a completed subscription session from Stripe", async () => {
    const stripe = fakeStripe({ "/subscriptions/sub_1": subObject() });
    const { service, store } = setup({ stripe });
    await store.createOrg(org());
    const payment = event("checkout.session.completed", { id: "cs_test_p", mode: "payment", payment_status: "paid", client_reference_id: "u1", metadata: { item: "workshop" } });
    expect(await service.handleEvent(payment)).toBe("applied");
    expect(await service.handleEvent({ ...payment, id: "evt_other" })).toBe("ignored");
    expect((await store.getOrg("u1"))?.purchases).toEqual([{ item: "workshop", at: NOW, ref: "cs_test_p" }]);

    const subscription = event("checkout.session.completed", { id: "cs_test_s", mode: "subscription", client_reference_id: "u1", subscription: "sub_1", metadata: { item: "workplace" } });
    expect(await service.handleEvent(subscription)).toBe("applied");
    expect((await store.getOrg("u1"))?.subscription?.status).toBe("active");
  });

  it("do not record an unpaid or unknown purchase, and leave other event types alone without remembering them", async () => {
    const { service, store } = setup();
    await store.createOrg(org());
    expect(await service.handleEvent(event("checkout.session.completed", { id: "cs_a", mode: "payment", payment_status: "unpaid", client_reference_id: "u1", metadata: { item: "workshop" } }))).toBe("ignored");
    expect(await service.handleEvent(event("checkout.session.completed", { id: "cs_b", mode: "payment", payment_status: "paid", client_reference_id: "u1", metadata: { item: "unicorn" } }))).toBe("ignored");
    expect((await store.getOrg("u1"))?.purchases).toEqual([]);
    const other = event("invoice.created", { id: "in_1" });
    expect(await service.handleEvent(other)).toBe("ignored");
    expect(await store.eventSeen(other.id)).toBe(false);
  });

  it("throw when they cannot be handled, so Stripe sends them again, and do not remember them", async () => {
    const { service, store } = setup({ stripe: fakeStripe({}) });
    await store.createOrg(org());
    const e = event("checkout.session.completed", { id: "cs_test_s", mode: "subscription", client_reference_id: "u1", subscription: "sub_1", metadata: { item: "workplace" } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(service.handleEvent(e)).rejects.toBeInstanceOf(OrgError);
    spy.mockRestore();
    expect(await store.eventSeen(e.id)).toBe(false);
  });
});

describe("prices on the pricing page", () => {
  it("come from Stripe, are remembered for a while, and are missing for a plan that is not set up", async () => {
    const stripe = fakeStripe({ "/prices/price_work1": { unit_amount: 499900, currency: "inr", active: true, recurring: { interval: "month" } }, "/prices/price_ws1": { unit_amount: 1500000, currency: "inr", active: true } });
    const { service } = setup({ stripe, env: { STRIPE_PRICE_WORKPLACE: "price_work1", STRIPE_PRICE_WORKSHOP: "price_ws1" } });
    const prices = await service.prices();
    expect(prices.workplace?.text).toBe("₹4,999 per month");
    expect(prices.workshop?.text).toBe("₹15,000");
    expect(prices.clinic).toBeNull();
    expect(prices.network).toBeNull();
    const before = stripe.calls.length;
    await service.prices();
    expect(stripe.calls.length).toBe(before);
  });

  it("are all missing when payment is not set up, and never throw", async () => {
    const { service } = setup({ stripe: null });
    expect(Object.values(await service.prices()).every((p) => p === null)).toBe(true);
  });
});
