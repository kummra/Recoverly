import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ handled: [] as unknown[], fail: false, user: { uid: "u1", email: null, emailVerified: false } as { uid: string; email: string | null; emailVerified: boolean } | null, configured: true }));

vi.mock("@/lib/server-auth", () => ({ getUserFromRequest: async () => env.user, getUserIdFromRequest: async () => env.user?.uid ?? null }));
vi.mock("@/lib/org/server", () => ({
  billingService: () =>
    env.configured
      ? {
          handleEvent: async (event: unknown) => {
            if (env.fail) throw new Error("database down");
            env.handled.push(event);
            return "applied";
          },
          checkout: async (uid: string, input: unknown) => ({ url: `https://checkout.stripe.com/c/${uid}`, input }),
          portal: async () => ({ url: "https://billing.stripe.com/p/x" }),
          confirm: async () => ({ active: true }),
          prices: async () => ({ clinic: { text: "₹1" } })
        }
      : null
}));

import { POST as checkout } from "@/app/api/billing/checkout/route";
import { POST as confirm } from "@/app/api/billing/confirm/route";
import { POST as portal } from "@/app/api/billing/portal/route";
import { GET as prices } from "@/app/api/billing/prices/route";
import { POST as webhook } from "@/app/api/billing/webhook/route";

const SECRET = "whsec_route_test";
const sign = (payload: string, t = Math.floor(Date.now() / 1000), secret = SECRET) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
const eventBody = JSON.stringify({ id: "evt_1", type: "customer.subscription.updated", created: 1_800_000_000, data: { object: { id: "sub_1" } } });
const hook = (body: string, signature?: string) => new NextRequest("https://recoverly.co.in/api/billing/webhook", { method: "POST", headers: signature ? { "stripe-signature": signature } : {}, body });
const ask = (path: string, body?: unknown) => new NextRequest(`https://recoverly.co.in${path}`, { method: "POST", headers: { authorization: "Bearer t", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(() => {
  env.handled = [];
  env.fail = false;
  env.configured = true;
  env.user = { uid: "u1", email: null, emailVerified: false };
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
});

describe("POST /api/billing/webhook", () => {
  it("applies an event whose signature is right", async () => {
    const response = await webhook(hook(eventBody, sign(eventBody)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, outcome: "applied" });
    expect(env.handled).toHaveLength(1);
  });

  it("refuses a wrong, missing, stale or altered signature and applies nothing", async () => {
    for (const signature of [sign(eventBody, undefined, "whsec_other"), sign(eventBody, 1_000), undefined, "t=1,v1=00", sign(`${eventBody} `)]) {
      expect((await webhook(hook(eventBody, signature))).status, String(signature)).toBe(400);
    }
    expect(env.handled).toEqual([]);
  });

  it("answers 400 to a signed body that is not an event", async () => {
    const body = JSON.stringify({ nope: true });
    expect((await webhook(hook(body, sign(body)))).status).toBe(400);
  });

  it("is unavailable without its secret or without payment set up, and open to nobody then", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect((await webhook(hook(eventBody, sign(eventBody)))).status).toBe(503);
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    env.configured = false;
    expect((await webhook(hook(eventBody, sign(eventBody)))).status).toBe(503);
  });

  it("answers 500 when it could not apply a valid event, so Stripe tries again, and says nothing about why", async () => {
    env.fail = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await webhook(hook(eventBody, sign(eventBody)));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "unavailable" });
    spy.mockRestore();
  });
});

describe("the signed-in billing routes", () => {
  it("answer 401 to someone who is not signed in", async () => {
    env.user = null;
    for (const response of [await checkout(ask("/api/billing/checkout", { plan: "clinic" })), await portal(ask("/api/billing/portal")), await confirm(ask("/api/billing/confirm", { sessionId: "cs_test_1" }))]) {
      expect(response.status).toBe(401);
    }
  });

  it("pass the plan or product and the signed-in person's id to the billing service, and nothing else", async () => {
    const response = await checkout(ask("/api/billing/checkout", { plan: "clinic", amount: 1, uid: "someone-else" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/c/u1", input: { plan: "clinic", product: undefined } });
    expect((await portal(ask("/api/billing/portal"))).status).toBe(200);
    expect(await (await confirm(ask("/api/billing/confirm", { sessionId: "cs_test_1" }))).json()).toEqual({ access: { active: true } });
  });

  it("are unavailable when payment is not set up", async () => {
    env.configured = false;
    expect((await checkout(ask("/api/billing/checkout", { plan: "clinic" }))).status).toBe(503);
  });
});

describe("GET /api/billing/prices", () => {
  it("is public, short-lived and carries nothing about any organisation", async () => {
    const response = await prices();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ prices: { clinic: { text: "₹1" } } });
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    env.configured = false;
    expect(await (await prices()).json()).toEqual({ prices: {} });
  });
});
