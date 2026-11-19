import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { PLANS, PLAN_IDS, planAllows, plansForKind, priceIdFromEnv } from "@/lib/billing/catalogue";
import { DAY_MS, type Subscription, accessSummary, hasAccess } from "@/lib/billing/entitlement";
import {
  StripeError,
  createCheckoutSession,
  createPortalSession,
  formEncode,
  formatPrice,
  parseEvent,
  retrieveCheckoutSession,
  retrievePrice,
  retrieveSubscription,
  stripeConfigFromEnv,
  subscriptionFromObject,
  verifyWebhookSignature
} from "@/lib/billing/stripe";

const NOW = 1_800_000_000_000;
const sub = (over: Partial<Subscription> = {}): Subscription => ({ source: "stripe", plan: "clinic", status: "active", currentPeriodEnd: NOW + 10 * DAY_MS, cancelAtPeriodEnd: false, updatedAt: NOW, ...over });

describe("the plans", () => {
  it("never allow the workspace to a plan that cannot serve a clinic or community service, and always include reports", () => {
    expect(planAllows("workplace", "workspace")).toBe(false);
    expect(planAllows("clinic", "workspace")).toBe(true);
    expect(planAllows("network", "rollup")).toBe(true);
    expect(planAllows("clinic", "rollup")).toBe(false);
    for (const id of PLAN_IDS) expect(PLANS[id].features).toContain("reports");
    expect(planAllows(null, "reports")).toBe(false);
  });

  it("offer each kind of organisation the plans that fit it", () => {
    expect(plansForKind("clinic").map((p) => p.id)).toEqual(["clinic", "network"]);
    expect(plansForKind("workplace").map((p) => p.id)).toEqual(["workplace", "network"]);
    expect(plansForKind("community").map((p) => p.id)).toEqual(["clinic", "network"]);
  });

  it("read a price id from the environment only if it looks like one", () => {
    expect(priceIdFromEnv("X", { X: " price_1AbC " })).toBe("price_1AbC");
    for (const bad of [undefined, "", "prod_123", "price_", "price_1 2", "sk_live_x"]) expect(priceIdFromEnv("X", { X: bad })).toBeNull();
  });
});

describe("who has access", () => {
  it("gives it for an active or trialing subscription and takes it from every other status", () => {
    expect(hasAccess(sub(), NOW)).toBe(true);
    expect(hasAccess(sub({ status: "trialing" }), NOW)).toBe(true);
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"] as const) expect(hasAccess(sub({ status }), NOW), status).toBe(false);
    expect(hasAccess(null, NOW)).toBe(false);
    expect(hasAccess(undefined, NOW)).toBe(false);
    expect(hasAccess({ ...sub(), plan: "gold" as never }, NOW)).toBe(false);
  });

  it("keeps a failed renewal open for a week, then closes it", () => {
    const end = NOW - 2 * DAY_MS;
    expect(hasAccess(sub({ status: "past_due", currentPeriodEnd: end }), NOW)).toBe(true);
    expect(accessSummary(sub({ status: "past_due", currentPeriodEnd: end }), NOW).inGrace).toBe(true);
    expect(hasAccess(sub({ status: "past_due", currentPeriodEnd: NOW - 8 * DAY_MS }), NOW)).toBe(false);
    expect(hasAccess(sub({ status: "past_due", currentPeriodEnd: null }), NOW)).toBe(false);
  });

  it("closes an account whose renewal was never confirmed, however the stored status reads", () => {
    expect(hasAccess(sub({ currentPeriodEnd: NOW - 2 * DAY_MS }), NOW)).toBe(true);
    expect(hasAccess(sub({ currentPeriodEnd: NOW - 4 * DAY_MS }), NOW)).toBe(false);
  });

  it("holds a manual activation only until its end date", () => {
    const manual = sub({ source: "manual" });
    expect(hasAccess(manual, NOW)).toBe(true);
    expect(hasAccess({ ...manual, currentPeriodEnd: NOW - 1 }, NOW)).toBe(false);
    expect(hasAccess({ ...manual, currentPeriodEnd: null }, NOW)).toBe(false);
  });

  it("summarises none for an organisation that has never paid", () => {
    expect(accessSummary(null, NOW)).toMatchObject({ active: false, plan: null, status: "none" });
  });
});

describe("Stripe's form encoding", () => {
  it("nests objects and arrays the way Stripe reads them and leaves empty values out", () => {
    expect(formEncode({ mode: "subscription", line_items: [{ price: "price_1", quantity: 1 }], metadata: { orgId: "o 1" }, empty: "", missing: undefined, none: null })).toBe(
      "mode=subscription&line_items[0][price]=price_1&line_items[0][quantity]=1&metadata[orgId]=o%201"
    );
    expect(formEncode({ ids: ["a", "b"] })).toBe("ids[0]=a&ids[1]=b");
  });
});

describe("the Stripe configuration", () => {
  it("accepts a secret key and refuses a publishable key, a missing key or junk", () => {
    expect(stripeConfigFromEnv({ STRIPE_SECRET_KEY: "sk_test_abc123" })).toEqual({ secretKey: "sk_test_abc123" });
    expect(stripeConfigFromEnv({ STRIPE_SECRET_KEY: "rk_live_abc123" })).not.toBeNull();
    for (const bad of [undefined, "", "pk_live_abc", "sk_live_", "hello"]) expect(stripeConfigFromEnv({ STRIPE_SECRET_KEY: bad })).toBeNull();
  });
});

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

describe("talking to Stripe", () => {
  it("makes a subscription checkout with the organisation recorded on the session and the subscription", async () => {
    const fetchImpl = fakeFetch({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
    const out = await createCheckoutSession({ secretKey: "sk_test_x", fetchImpl: fetchImpl as unknown as typeof fetch }, { mode: "subscription", priceId: "price_1", orgId: "org1", item: "clinic", email: "a@b.in", successUrl: "https://x/ok", cancelUrl: "https://x/no" });
    expect(out).toEqual({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk_test_x");
    expect(headers["Stripe-Version"]).toBe("2024-06-20");
    const body = init.body as string;
    expect(body).toContain("mode=subscription");
    expect(body).toContain("line_items[0][price]=price_1");
    expect(body).toContain("client_reference_id=org1");
    expect(body).toContain("subscription_data[metadata][orgId]=org1");
    expect(body).toContain("subscription_data[metadata][item]=clinic");
    expect(body).toContain("customer_email=a%40b.in");
    expect(body).not.toContain("customer_update");
  });

  it("uses an existing customer instead of an email, and records one-off purchases without subscription data", async () => {
    const fetchImpl = fakeFetch({ id: "cs_2", url: "https://checkout.stripe.com/c/pay/cs_2" });
    await createCheckoutSession({ secretKey: "sk_test_x", fetchImpl: fetchImpl as unknown as typeof fetch }, { mode: "payment", priceId: "price_2", orgId: "org1", item: "workshop", customerId: "cus_9", email: "a@b.in", successUrl: "https://x/ok", cancelUrl: "https://x/no" });
    const body = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string;
    expect(body).toContain("customer=cus_9");
    expect(body).not.toContain("customer_email");
    expect(body).toContain("customer_update[name]=auto");
    expect(body).not.toContain("subscription_data");
  });

  it("turns a refusal into an error with Stripe's own message and status", async () => {
    const fetchImpl = fakeFetch({ error: { message: "No such price", code: "resource_missing" } }, 400);
    await expect(createCheckoutSession({ secretKey: "sk_test_x", fetchImpl: fetchImpl as unknown as typeof fetch }, { mode: "payment", priceId: "price_x", orgId: "o", item: "i", successUrl: "u", cancelUrl: "c" })).rejects.toMatchObject({ message: "No such price", status: 400, code: "resource_missing" });
    await expect(createPortalSession({ secretKey: "sk_test_x", fetchImpl: fakeFetch({}) as unknown as typeof fetch }, { customerId: "cus", returnUrl: "r" })).rejects.toBeInstanceOf(StripeError);
  });

  it("reads a checkout session and a subscription back from Stripe by id", async () => {
    const session = fakeFetch({ id: "cs_test_1", status: "complete" });
    expect(await retrieveCheckoutSession({ secretKey: "sk_test_x", fetchImpl: session as unknown as typeof fetch }, "cs_test_1")).toMatchObject({ status: "complete" });
    expect((session.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe("https://api.stripe.com/v1/checkout/sessions/cs_test_1");
    expect((session.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe("GET");
    const sub = fakeFetch({ id: "sub_1" });
    await retrieveSubscription({ secretKey: "sk_test_x", fetchImpl: sub as unknown as typeof fetch }, "sub_1");
    expect((sub.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe("https://api.stripe.com/v1/subscriptions/sub_1");
  });

  it("opens the customer portal", async () => {
    const fetchImpl = fakeFetch({ url: "https://billing.stripe.com/p/session/x" });
    expect(await createPortalSession({ secretKey: "sk_test_x", fetchImpl: fetchImpl as unknown as typeof fetch }, { customerId: "cus_1", returnUrl: "https://x/portal" })).toEqual({ url: "https://billing.stripe.com/p/session/x" });
    expect((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body).toBe("customer=cus_1&return_url=https%3A%2F%2Fx%2Fportal");
  });

  it("reads a price for the pricing page and says nothing for an inactive or odd one", async () => {
    const ok = fakeFetch({ unit_amount: 499900, currency: "inr", active: true, recurring: { interval: "month" } });
    expect(await retrievePrice({ secretKey: "sk_test_x", fetchImpl: ok as unknown as typeof fetch }, "price_1")).toMatchObject({ amount: 499900, currency: "inr", interval: "month" });
    expect(await retrievePrice({ secretKey: "sk_test_x", fetchImpl: fakeFetch({ unit_amount: 1, currency: "inr", active: false }) as unknown as typeof fetch }, "price_1")).toBeNull();
    expect(await retrievePrice({ secretKey: "sk_test_x", fetchImpl: fakeFetch({ currency: "inr" }) as unknown as typeof fetch }, "price_1")).toBeNull();
    expect(formatPrice(499900, "inr", "month")).toBe("₹4,999 per month");
    expect(formatPrice(1500, "usd", null)).toBe("$15");
  });
});

const SECRET = "whsec_test_secret";
const sign = (payload: string, t: number, secret = SECRET) => createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");

describe("verifying a webhook", () => {
  const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated", created: 1_800_000_000, data: { object: { id: "sub_1" } } });
  const now = 1_800_000_000;

  it("accepts a correct signature and any one of several", () => {
    expect(verifyWebhookSignature(payload, `t=${now},v1=${sign(payload, now)}`, SECRET, now)).toBe(true);
    expect(verifyWebhookSignature(payload, `t=${now},v1=${"0".repeat(64)},v1=${sign(payload, now)}`, SECRET, now)).toBe(true);
  });

  it("refuses a changed body, a wrong secret, a stale time, a missing or malformed header", () => {
    const good = `t=${now},v1=${sign(payload, now)}`;
    expect(verifyWebhookSignature(`${payload} `, good, SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(payload, good, "whsec_other", now)).toBe(false);
    expect(verifyWebhookSignature(payload, `t=${now - 400},v1=${sign(payload, now - 400)}`, SECRET, now)).toBe(false);
    for (const header of [null, "", "garbage", `t=${now}`, `v1=${sign(payload, now)}`, `t=abc,v1=${sign(payload, now)}`, `t=${now},v1=short`]) expect(verifyWebhookSignature(payload, header, SECRET, now), String(header)).toBe(false);
    expect(verifyWebhookSignature(payload, good, "", now)).toBe(false);
  });

  it("reads the event and the subscription it describes, from either API shape", () => {
    const event = parseEvent(payload);
    expect(event).toMatchObject({ id: "evt_1", type: "customer.subscription.updated" });
    expect(parseEvent("not json")).toBeNull();
    expect(parseEvent(JSON.stringify({ id: "x" }))).toBeNull();

    const old = subscriptionFromObject({ id: "sub_1", customer: "cus_1", status: "past_due", current_period_end: 1_800_100_000, cancel_at_period_end: true, metadata: { orgId: "o1", item: "clinic" } });
    expect(old).toEqual({ subscriptionId: "sub_1", customerId: "cus_1", status: "past_due", currentPeriodEnd: 1_800_100_000_000, cancelAtPeriodEnd: true, orgId: "o1", item: "clinic" });
    const neu = subscriptionFromObject({ id: "sub_2", customer: { id: "cus_2" }, status: "active", items: { data: [{ current_period_end: 1_800_200_000, price: { id: "price_77" } }] } });
    expect(neu).toMatchObject({ customerId: "cus_2", currentPeriodEnd: 1_800_200_000_000, status: "active", cancelAtPeriodEnd: false, priceId: "price_77" });
    expect(subscriptionFromObject({ id: "sub_3", customer: "cus_3", status: "active" }, true)?.status).toBe("canceled");
    expect(subscriptionFromObject({ id: "sub_4", customer: "c", status: "weird" })?.status).toBe("incomplete");
    expect(subscriptionFromObject({ status: "active" })).toBeNull();
  });
});

describe("what the plans claim", () => {
  it("lists only features that are built: the ones still to come are in no plan", () => {
    for (const id of PLAN_IDS) {
      for (const notBuilt of ["logo", "emailReports"] as const) expect(PLANS[id].features, `${id} must not claim ${notBuilt} yet`).not.toContain(notBuilt);
      expect(PLANS[id].features, id).toContain("referrals");
    }
  });
});
