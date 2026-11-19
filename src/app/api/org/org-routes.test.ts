import { NextRequest, type NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DAY_MS } from "@/lib/billing/entitlement";

const env = vi.hoisted(() => ({ user: null as { uid: string; email: string | null; emailVerified: boolean } | null }));

vi.mock("@/lib/server-auth", () => ({
  getUserFromRequest: async () => env.user,
  getUserIdFromRequest: async () => env.user?.uid ?? null
}));
vi.mock("@/lib/org/server", async () => {
  const { memoryOrgStore } = await import("@/lib/org/memory-store");
  const { createOrgService } = await import("@/lib/org/service");
  const store = memoryOrgStore();
  return { orgStore: store, orgService: createOrgService({ store }), billingService: () => null };
});

import { DELETE as deleteProgramme, PATCH as patchProgramme, PUT as putProgramme } from "@/app/api/org/programmes/[code]/route";
import { POST as postProgramme } from "@/app/api/org/programmes/route";
import { POST as postRollup } from "@/app/api/org/rollup/route";
import { GET as getOrg, PATCH as patchOrg, POST as postOrg } from "@/app/api/org/route";
import { DELETE as endSession, POST as startSession } from "@/app/api/org/session/route";
import { orgStore } from "@/lib/org/server";
import { SESSION_COOKIE, verifySession } from "@/lib/org/session";

const store = orgStore!;
let n = 0;
const NOW = () => Date.now();
const good = { name: "Acme depot", welcome: { en: "Welcome to the Acme programme. You are not alone." }, contacts: [{ label: "EAP", phone: "9876543210" }] };
const ask = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(`https://recoverly.co.in${path}`, { method, headers: { authorization: "Bearer t", "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (code: string) => ({ params: Promise.resolve({ code }) });
const subscribe = (uid: string, plan: "workplace" | "clinic" | "network" = "workplace") =>
  store.updateOrg(uid, (o) => (o ? { ...o, subscription: { source: "stripe", plan, status: "active", currentPeriodEnd: NOW() + 20 * DAY_MS, cancelAtPeriodEnd: false, updatedAt: 1 } } : null));

beforeEach(() => {
  n += 1;
  env.user = { uid: `user-${n}`, email: "owner@acme.example", emailVerified: true };
  process.env.SESSION_SECRET = "s".repeat(40);
});

describe("who may use the portal routes", () => {
  it("answer 401 to someone who is not signed in, on every route", async () => {
    env.user = null;
    for (const response of [await getOrg(ask("GET", "/api/org")), await postOrg(ask("POST", "/api/org", {})), await postProgramme(ask("POST", "/api/org/programmes", {})), await postRollup(ask("POST", "/api/org/rollup")), await startSession(ask("POST", "/api/org/session"))]) {
      expect(response.status).toBe(401);
    }
  });

  it("refuse a request that comes from another site's page", async () => {
    const response = await postOrg(ask("POST", "/api/org", { name: "Acme", kind: "workplace", acceptTerms: true }, { origin: "https://evil.example", host: "recoverly.co.in" }));
    expect(response.status).toBe(403);
  });

  it("never let an answer be cached", async () => {
    expect((await getOrg(ask("GET", "/api/org"))).headers.get("cache-control")).toBe("no-store");
  });

  it("refuse a body that is too large or not an object", async () => {
    expect((await postOrg(ask("POST", "/api/org", { name: "x".repeat(5000) }))).status).toBe(413);
    const bad = new NextRequest("https://recoverly.co.in/api/org", { method: "POST", headers: { authorization: "Bearer t" }, body: "[1,2]" });
    expect((await postOrg(bad)).status).toBe(400);
  });
});

describe("making an organisation and a programme", () => {
  it("creates the organisation, shows it back, and refuses a second one", async () => {
    expect((await (await getOrg(ask("GET", "/api/org"))).json()).overview).toBeNull();
    const created = await postOrg(ask("POST", "/api/org", { name: "Acme", kind: "workplace", acceptTerms: true }));
    expect(created.status).toBe(201);
    const { overview } = await created.json();
    expect(overview.org).toMatchObject({ name: "Acme", kind: "workplace", kindVerified: false });
    expect(overview.access.active).toBe(false);
    expect((await postOrg(ask("POST", "/api/org", { name: "Again", kind: "workplace", acceptTerms: true }))).status).toBe(409);
    expect((await patchOrg(ask("PATCH", "/api/org", { name: "Acme Ltd" }))).status).toBe(200);
  });

  it("asks for a plan first (402), then makes the programme as a draft, and says exactly what is wrong with bad words", async () => {
    await postOrg(ask("POST", "/api/org", { name: "Acme", kind: "workplace", acceptTerms: true }));
    const noPlan = await postProgramme(ask("POST", "/api/org/programmes", { content: good }));
    expect(noPlan.status).toBe(402);

    await subscribe(env.user!.uid);
    const bad = await postProgramme(ask("POST", "/api/org/programmes", { content: { ...good, contacts: [{ label: "Line", phone: "12" }] } }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).details.join(" ")).toMatch(/Contact 1.*3 to 15 digits/);

    const made = await postProgramme(ask("POST", "/api/org/programmes", { content: good }));
    expect(made.status).toBe(201);
    const { programme } = await made.json();
    expect(programme).toMatchObject({ reviewState: "pending", live: null });
    expect(programme.code).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
    expect(JSON.stringify(programme)).not.toMatch(/keyHash|reportKeyHash/);
  });

  it("returns a private link's secret once, when the report is switched on, and never again", async () => {
    await postOrg(ask("POST", "/api/org", { name: "Acme", kind: "workplace", acceptTerms: true }));
    await subscribe(env.user!.uid);
    const { programme } = await (await postProgramme(ask("POST", "/api/org/programmes", { content: good }))).json();
    const on = await (await patchProgramme(ask("PATCH", `/api/org/programmes/${programme.code}`, { features: { headcount: true } }), ctx(programme.code))).json();
    expect(on.reportKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(on.programme.reportLinkOn).toBe(true);
    const after = await (await getOrg(ask("GET", "/api/org"))).json();
    expect(JSON.stringify(after)).not.toContain(on.reportKey);
    const again = await (await patchProgramme(ask("PATCH", `/api/org/programmes/${programme.code}`, { features: { figures: true } }), ctx(programme.code))).json();
    expect(again.reportKey).toBeUndefined();
  });

  it("answer 404, saying nothing about whose it is, for another organisation's programme or a code that is not one", async () => {
    await postOrg(ask("POST", "/api/org", { name: "Acme", kind: "workplace", acceptTerms: true }));
    await subscribe(env.user!.uid);
    const { programme } = await (await postProgramme(ask("POST", "/api/org/programmes", { content: good }))).json();

    n += 1;
    env.user = { uid: `user-${n}`, email: null, emailVerified: false };
    await postOrg(ask("POST", "/api/org", { name: "Rival", kind: "workplace", acceptTerms: true }));
    await subscribe(env.user.uid);
    for (const response of [
      await putProgramme(ask("PUT", `/api/org/programmes/${programme.code}`, { content: good }), ctx(programme.code)),
      await patchProgramme(ask("PATCH", `/api/org/programmes/${programme.code}`, { features: { headcount: true } }), ctx(programme.code)),
      await deleteProgramme(ask("DELETE", `/api/org/programmes/${programme.code}`), ctx(programme.code)),
      await deleteProgramme(ask("DELETE", "/api/org/programmes/!!"), ctx("!!"))
    ]) {
      expect(response.status).toBe(404);
    }
  });

  it("refuse the workspace to a workplace even on the largest plan, and the roll-up to a smaller plan", async () => {
    await postOrg(ask("POST", "/api/org", { name: "Acme", kind: "workplace", acceptTerms: true }));
    await subscribe(env.user!.uid, "network");
    const { programme } = await (await postProgramme(ask("POST", "/api/org/programmes", { content: good }))).json();
    await patchProgramme(ask("PATCH", `/api/org/programmes/${programme.code}`, { features: { headcount: true } }), ctx(programme.code));
    const refused = await patchProgramme(ask("PATCH", `/api/org/programmes/${programme.code}`, { features: { workspace: true } }), ctx(programme.code));
    expect(refused.status).toBe(403);
    expect((await refused.json()).message).toMatch(/clinics and community services/);
    expect((await postRollup(ask("POST", "/api/org/rollup"))).status).toBe(200);
    await subscribe(env.user!.uid, "workplace");
    expect((await postRollup(ask("POST", "/api/org/rollup"))).status).toBe(400);
  });

  it("answer 400 to a change that is not one", async () => {
    await postOrg(ask("POST", "/api/org", { name: "Acme", kind: "workplace", acceptTerms: true }));
    await subscribe(env.user!.uid);
    const { programme } = await (await postProgramme(ask("POST", "/api/org/programmes", { content: good }))).json();
    expect((await patchProgramme(ask("PATCH", `/api/org/programmes/${programme.code}`, {}), ctx(programme.code))).status).toBe(400);
  });
});

describe("the members' cookie route", () => {
  it("says no organisation (404) and no plan (402), and otherwise sets a short, httpOnly, signed cookie for the organisation pages", async () => {
    expect((await startSession(ask("POST", "/api/org/session"))).status).toBe(404);
    await postOrg(ask("POST", "/api/org", { name: "Acme", kind: "workplace", acceptTerms: true }));
    expect((await startSession(ask("POST", "/api/org/session"))).status).toBe(402);

    await subscribe(env.user!.uid);
    const response = await startSession(ask("POST", "/api/org/session"));
    expect(response.status).toBe(200);
    const cookie = (response as NextResponse).cookies.get(SESSION_COOKIE);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/partners", maxAge: 1800 });
    expect(verifySession(cookie!.value, "s".repeat(40), NOW())).toBe(env.user!.uid);
    expect(cookie!.value).not.toContain(env.user!.uid);
  });

  it("is unavailable, rather than open, without a secret", async () => {
    delete process.env.SESSION_SECRET;
    expect((await startSession(ask("POST", "/api/org/session"))).status).toBe(503);
  });

  it("can be cleared without signing in, because all it can do is remove this browser's own cookie", async () => {
    env.user = null;
    const response = await endSession();
    expect(response.cookies.get(SESSION_COOKIE)).toMatchObject({ value: "", maxAge: 0, path: "/partners" });
  });
});
