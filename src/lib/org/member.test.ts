import { beforeEach, describe, expect, it, vi } from "vitest";

import { DAY_MS } from "@/lib/billing/entitlement";

const env = vi.hoisted(() => ({ cookie: undefined as string | undefined, reads: 0 }));

vi.mock("next/headers", () => ({
  cookies: async () => {
    env.reads += 1;
    return { get: (name: string) => (name === "rc_org" && env.cookie ? { name, value: env.cookie } : undefined) };
  }
}));
vi.mock("@/lib/org/server", async () => {
  const { memoryOrgStore } = await import("@/lib/org/memory-store");
  return { orgStore: memoryOrgStore() };
});

import { currentMember } from "@/lib/org/member";
import { orgStore } from "@/lib/org/server";
import { signSession } from "@/lib/org/session";

const SECRET = "m".repeat(40);
const store = orgStore!;
const subscription = (over: Record<string, unknown> = {}) => ({ source: "stripe" as const, plan: "workplace" as const, status: "active" as const, currentPeriodEnd: Date.now() + 20 * DAY_MS, cancelAtPeriodEnd: false, updatedAt: 1, ...over });

beforeEach(async () => {
  env.cookie = undefined;
  env.reads = 0;
  process.env.SESSION_SECRET = SECRET;
  await store.createOrg({ id: "u1", name: "Acme", kind: "workplace", contactEmail: null, kindVerified: false, createdAt: 1, updatedAt: 1, termsAcceptedAt: 1, termsVersion: "2026-11", subscription: subscription(), purchases: [] });
  await store.updateOrg("u1", (o) => (o ? { ...o, subscription: subscription() } : null));
});

describe("who is a member, on the server", () => {
  it("is the owner of an organisation with an active plan, who holds a cookie we signed", async () => {
    env.cookie = signSession("u1", SECRET, Date.now());
    expect(await currentMember()).toMatchObject({ plan: "workplace", org: { id: "u1" } });
  });

  it("is nobody without a cookie, with a forged or foreign one, or an expired one", async () => {
    expect(await currentMember()).toBeNull();
    env.cookie = signSession("u1", "x".repeat(40), Date.now());
    expect(await currentMember()).toBeNull();
    env.cookie = signSession("u1", SECRET, Date.now() - 2 * 60 * 60 * 1000);
    expect(await currentMember()).toBeNull();
    env.cookie = "u1";
    expect(await currentMember()).toBeNull();
  });

  it("stops being a member the moment the plan lapses, though the cookie is still good", async () => {
    env.cookie = signSession("u1", SECRET, Date.now());
    await store.updateOrg("u1", (o) => (o ? { ...o, subscription: subscription({ status: "canceled" }) } : null));
    expect(await currentMember()).toBeNull();
    await store.updateOrg("u1", (o) => (o ? { ...o, subscription: subscription({ currentPeriodEnd: Date.now() - 10 * DAY_MS }) } : null));
    expect(await currentMember()).toBeNull();
    await store.updateOrg("u1", (o) => (o ? { ...o, subscription: null } : null));
    expect(await currentMember()).toBeNull();
  });

  it("is nobody at all without a secret, so the paywall fails closed", async () => {
    env.cookie = signSession("u1", SECRET, Date.now());
    delete process.env.SESSION_SECRET;
    expect(await currentMember()).toBeNull();
  });

  it("always reads the cookies, even when it already knows the answer is no, so the page is built per request and not once for everybody", async () => {
    delete process.env.SESSION_SECRET;
    await currentMember();
    expect(env.reads).toBe(1);
  });
});
