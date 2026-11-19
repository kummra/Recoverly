import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DAY_MS } from "@/lib/billing/entitlement";

const env = vi.hoisted(() => ({ user: null as { uid: string; email: string | null; emailVerified: boolean } | null }));

vi.mock("@/lib/server-auth", () => ({ getUserFromRequest: async () => env.user, getUserIdFromRequest: async () => env.user?.uid ?? null }));
vi.mock("@/lib/org/server", async () => {
  const { memoryOrgStore } = await import("@/lib/org/memory-store");
  const { createOrgService } = await import("@/lib/org/service");
  const store = memoryOrgStore();
  return { orgStore: store, orgService: createOrgService({ store }), billingService: () => null };
});

import { POST as ownerOrg } from "@/app/api/owner/org/route";
import { POST as ownerReview } from "@/app/api/owner/review/route";
import { GET as ownerOverview } from "@/app/api/owner/route";
import { orgService, orgStore } from "@/lib/org/server";

const store = orgStore!;
const service = orgService!;
const good = { name: "Acme depot", welcome: { en: "Welcome to the Acme programme. You are not alone." }, contacts: [{ label: "EAP", phone: "9876543210" }] };
const ask = (method: string, path: string, body?: unknown) => new NextRequest(`https://recoverly.co.in${path}`, { method, headers: { authorization: "Bearer t", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
let code = "";

beforeEach(async () => {
  process.env.OWNER_UIDS = "owner-1";
  env.user = { uid: "owner-1", email: null, emailVerified: false };
  if (!code) {
    await service.createOrg({ uid: "org-1", email: null, emailVerified: false }, { name: "Acme", kind: "workplace", acceptTerms: true });
    await store.updateOrg("org-1", (o) => (o ? { ...o, subscription: { source: "stripe", plan: "workplace", status: "active", currentPeriodEnd: Date.now() + 20 * DAY_MS, cancelAtPeriodEnd: false, updatedAt: 1 } } : null));
    code = (await service.createProgramme("org-1", good)).code;
  }
});

describe("the owner routes", () => {
  it("do not exist for anyone who is not the owner: a plain 404, not a 401 or 403", async () => {
    for (const user of [null, { uid: "org-1", email: null, emailVerified: false }]) {
      env.user = user;
      const responses = [await ownerOverview(ask("GET", "/api/owner")), await ownerReview(ask("POST", "/api/owner/review", { code, decision: "approve" })), await ownerOrg(ask("POST", "/api/owner/org", { uid: "org-1", action: "verifyKind" }))];
      expect(responses.map((r) => r.status)).toEqual(user ? [404, 404, 404] : [401, 401, 401]);
    }
  });

  it("are closed to everybody when OWNER_UIDS is not set", async () => {
    delete process.env.OWNER_UIDS;
    expect((await ownerOverview(ask("GET", "/api/owner"))).status).toBe(404);
  });

  it("show the owner the organisations and the programmes waiting for review", async () => {
    const body = await (await ownerOverview(ask("GET", "/api/owner"))).json();
    expect(body.orgs[0]).toMatchObject({ id: "org-1", name: "Acme", access: { active: true } });
    expect(body.pending.map((p: { code: string }) => p.code)).toContain(code);
  });

  it("approve, reject (with a reason) and take down, and refuse a decision that is not one", async () => {
    expect((await ownerReview(ask("POST", "/api/owner/review", { code, decision: "reject", note: "" }))).status).toBe(400);
    expect((await ownerReview(ask("POST", "/api/owner/review", { code, decision: "delete" }))).status).toBe(400);
    expect((await ownerReview(ask("POST", "/api/owner/review", { code: "!!", decision: "approve" }))).status).toBe(400);
    expect((await ownerReview(ask("POST", "/api/owner/review", { code, decision: "approve" }))).status).toBe(200);
    expect((await store.getProgramme(code))?.content?.name).toBe("Acme depot");
    expect((await ownerReview(ask("POST", "/api/owner/review", { code, decision: "unpublish", note: "Taken down" }))).status).toBe(200);
    expect((await store.getProgramme(code))?.content).toBeNull();
    expect((await ownerReview(ask("POST", "/api/owner/review", { code: "NOSUCHCODE22", decision: "approve" }))).status).toBe(404);
  });

  it("confirm an organisation's kind and switch a manual plan on and off", async () => {
    expect((await ownerOrg(ask("POST", "/api/owner/org", { uid: "org-1", action: "verifyKind" }))).status).toBe(200);
    expect((await store.getOrg("org-1"))?.kindVerified).toBe(true);
    expect((await ownerOrg(ask("POST", "/api/owner/org", { uid: "org-1", action: "bogus" }))).status).toBe(400);
    expect((await ownerOrg(ask("POST", "/api/owner/org", { uid: "", action: "verifyKind" }))).status).toBe(400);
    // An active card subscription cannot be overwritten by hand.
    expect((await ownerOrg(ask("POST", "/api/owner/org", { uid: "org-1", action: "activate", plan: "workplace", endsAt: new Date(Date.now() + 30 * DAY_MS).toISOString() }))).status).toBe(409);
    await store.updateOrg("org-1", (o) => (o ? { ...o, subscription: null } : null));
    expect((await ownerOrg(ask("POST", "/api/owner/org", { uid: "org-1", action: "activate", plan: "workplace", endsAt: new Date(Date.now() + 30 * DAY_MS).toISOString(), note: "Invoice 1" }))).status).toBe(200);
    expect((await store.getOrg("org-1"))?.subscription).toMatchObject({ source: "manual", status: "active", note: "Invoice 1" });
    expect((await ownerOrg(ask("POST", "/api/owner/org", { uid: "org-1", action: "deactivate" }))).status).toBe(200);
    expect((await store.getOrg("org-1"))?.subscription?.status).toBe("canceled");
  });
});
