/**
 * A small client for Stripe's HTTP API, written against `fetch` (no package), and the check on its webhooks.
 *
 * Only what the paywall needs: a Checkout page for a subscription or one-off service, the customer portal for
 * managing or cancelling, a price to show on the pricing page, and webhook verification. Nothing here ever
 * sees a card: Stripe's own pages take it. Every function takes the key and `fetch` it is given, so tests
 * never touch the network.
 *
 * Money goes where the Stripe account's payout settings send it (a bank account, set by the account holder
 * in Stripe's dashboard). That is not something code can change, and a phone number is not a payout method.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { type SubscriptionStatus, normaliseStatus } from "@/lib/billing/entitlement";

export const STRIPE_API = "https://api.stripe.com/v1";
/** Pinned so a change on Stripe's side cannot alter the shapes read here. */
export const STRIPE_VERSION = "2024-06-20";

export type StripeConfig = { secretKey: string; fetchImpl?: typeof fetch };

/** The configuration from the environment, or `null` when online payment is not set up. Refuses anything that is not a secret key. */
export function stripeConfigFromEnv(env: Record<string, string | undefined> = process.env): StripeConfig | null {
  const key = env.STRIPE_SECRET_KEY?.trim();
  return key && /^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(key) ? { secretKey: key } : null;
}

export class StripeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
  }
}

/** Stripe's form encoding: nested objects as `a[b]=1`, arrays as `a[0][b]=1`; `undefined`, `null` and empty strings left out. */
export function formEncode(params: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item !== null && typeof item === "object") parts.push(formEncode(item as Record<string, unknown>, `${name}[${index}]`));
        else if (item !== undefined && item !== null) parts.push(`${name}[${index}]=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof value === "object") {
      parts.push(formEncode(value as Record<string, unknown>, name));
    } else {
      parts.push(`${name}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

async function call(config: StripeConfig, method: "GET" | "POST", path: string, params?: Record<string, unknown>, idempotencyKey?: string): Promise<Record<string, unknown>> {
  const doFetch = config.fetchImpl ?? fetch;
  const headers: Record<string, string> = { Authorization: `Bearer ${config.secretKey}`, "Stripe-Version": STRIPE_VERSION };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await doFetch(`${STRIPE_API}${path}`, { method, headers, body: method === "POST" ? formEncode(params ?? {}) : undefined });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error = (data.error ?? {}) as { message?: unknown; code?: unknown };
    throw new StripeError(typeof error.message === "string" ? error.message : "Stripe request failed", response.status, typeof error.code === "string" ? error.code : undefined);
  }
  return data;
}

export type CheckoutInput = {
  mode: "subscription" | "payment";
  priceId: string;
  orgId: string;
  /** The plan or product being bought: recorded on Stripe's side so the webhook knows what was paid for. */
  item: string;
  customerId?: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createCheckoutSession(config: StripeConfig, input: CheckoutInput): Promise<{ id: string; url: string }> {
  const metadata = { orgId: input.orgId, item: input.item };
  const data = await call(
    config,
    "POST",
    "/checkout/sessions",
    {
      mode: input.mode,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.orgId,
      customer: input.customerId,
      customer_email: input.customerId ? undefined : input.email,
      metadata,
      ...(input.mode === "subscription" ? { subscription_data: { metadata } } : {}),
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      ...(input.customerId ? { customer_update: { name: "auto", address: "auto" } } : {})
    },
    `checkout-${input.orgId}-${input.item}-${Math.floor(Date.now() / 60_000)}`
  );
  if (typeof data.id !== "string" || typeof data.url !== "string") throw new StripeError("Stripe did not return a checkout address", 502);
  return { id: data.id, url: data.url };
}

export async function createPortalSession(config: StripeConfig, input: { customerId: string; returnUrl: string }): Promise<{ url: string }> {
  const data = await call(config, "POST", "/billing_portal/sessions", { customer: input.customerId, return_url: input.returnUrl });
  if (typeof data.url !== "string") throw new StripeError("Stripe did not return a portal address", 502);
  return { url: data.url };
}

/** A Checkout session as Stripe holds it, used to confirm a payment when the person comes back from Stripe's page. */
export async function retrieveCheckoutSession(config: StripeConfig, sessionId: string): Promise<Record<string, unknown>> {
  return call(config, "GET", `/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export async function retrieveSubscription(config: StripeConfig, subscriptionId: string): Promise<Record<string, unknown>> {
  return call(config, "GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export type PriceDisplay = { amount: number; currency: string; interval: "month" | "year" | null; text: string };

const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

export function formatPrice(amount: number, currency: string, interval: "month" | "year" | null): string {
  const code = currency.toUpperCase();
  const major = ZERO_DECIMAL.has(currency.toLowerCase()) ? amount : amount / 100;
  const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: code, maximumFractionDigits: Number.isInteger(major) ? 0 : 2 }).format(major);
  return interval ? `${money} per ${interval}` : money;
}

export async function retrievePrice(config: StripeConfig, priceId: string): Promise<PriceDisplay | null> {
  const data = await call(config, "GET", `/prices/${encodeURIComponent(priceId)}`);
  const amount = data.unit_amount;
  const currency = data.currency;
  if (typeof amount !== "number" || typeof currency !== "string" || data.active === false) return null;
  const recurring = data.recurring as { interval?: unknown } | null | undefined;
  const interval = recurring?.interval === "month" || recurring?.interval === "year" ? recurring.interval : null;
  return { amount, currency, interval, text: formatPrice(amount, currency, interval) };
}

// ─── Webhooks ─────────────────────────────────────────────────────────────

/**
 * Stripe signs `{timestamp}.{raw body}` with the endpoint's secret (HMAC-SHA256, hex) and sends
 * `Stripe-Signature: t=…,v1=…`. Valid if any `v1` matches, compared in constant time, and the timestamp is recent.
 */
export function verifyWebhookSignature(payload: string, header: string | null, secret: string, nowSeconds: number, toleranceSeconds = 300): boolean {
  if (!header || !secret) return false;
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key?.trim() === "t") timestamp = value?.trim() ?? "";
    else if (key?.trim() === "v1" && value) signatures.push(value.trim());
  }
  const t = Number(timestamp);
  if (!timestamp || !Number.isFinite(t) || signatures.length === 0 || Math.abs(nowSeconds - t) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  return signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/.test(signature)) return false;
    return timingSafeEqual(expected, Buffer.from(signature, "hex"));
  });
}

export type StripeEvent = { id: string; type: string; created: number; object: Record<string, unknown> };

export function parseEvent(payload: string): StripeEvent | null {
  try {
    const raw = JSON.parse(payload) as { id?: unknown; type?: unknown; created?: unknown; data?: { object?: unknown } };
    const object = raw.data?.object;
    if (typeof raw.id !== "string" || typeof raw.type !== "string" || typeof raw.created !== "number" || typeof object !== "object" || object === null) return null;
    return { id: raw.id, type: raw.type, created: raw.created, object: object as Record<string, unknown> };
  } catch {
    return null;
  }
}

export type SubscriptionUpdate = {
  subscriptionId: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  /** The price the subscription is on now (it changes when a plan is switched in the customer portal). */
  priceId?: string;
  orgId?: string;
  item?: string;
};

export const idOf = (value: unknown): string | null => (typeof value === "string" ? value : typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string" ? (value as { id: string }).id : null);

/** What a `customer.subscription.*` event says, in our terms. The period end is on the subscription or, in newer API versions, on its first item. */
export function subscriptionFromObject(object: Record<string, unknown>, deleted = false): SubscriptionUpdate | null {
  const subscriptionId = idOf(object.id);
  const customerId = idOf(object.customer);
  if (!subscriptionId || !customerId) return null;
  const items = (object.items as { data?: Array<{ current_period_end?: unknown; price?: unknown; plan?: unknown }> } | undefined)?.data;
  const endSeconds = typeof object.current_period_end === "number" ? object.current_period_end : typeof items?.[0]?.current_period_end === "number" ? items[0].current_period_end : null;
  const metadata = (object.metadata ?? {}) as Record<string, unknown>;
  const priceId = idOf(items?.[0]?.price) ?? idOf(items?.[0]?.plan);
  return {
    subscriptionId,
    customerId,
    status: deleted ? "canceled" : normaliseStatus(object.status),
    currentPeriodEnd: endSeconds === null ? null : endSeconds * 1000,
    cancelAtPeriodEnd: object.cancel_at_period_end === true,
    ...(priceId ? { priceId } : {}),
    orgId: typeof metadata.orgId === "string" ? metadata.orgId : undefined,
    item: typeof metadata.item === "string" ? metadata.item : undefined
  };
}
