import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DAY_MS } from "@/lib/billing/entitlement";

const env = vi.hoisted(() => ({ user: null as { uid: string; email: string | null; emailVerified: boolean } | null }));

vi.mock("@/lib/server-auth", () => ({ getUserFromRequest: async () => env.user, getUserIdFromRequest: async () => env.user?.uid ?? null }));
vi.mock("@/lib/org/server", async () => {
  const { memoryOrgStore } = await import("@/lib/org/memory-store");
  const { createOrgService } = await import("@/lib/org/service");
  const { createDirectory } = await import("@/lib/org/directory");
  const store = memoryOrgStore();
  return { orgStore: store, orgService: createOrgService({ store }), directory: createDirectory({ store }), billingService: () => null };
});

import { DELETE as removeLogo, GET as ownLogo, PUT as sendLogo } from "@/app/api/org/programmes/[code]/logo/route";
import { GET as ownerLogo } from "@/app/api/owner/logo/route";
import { GET as publicLogo } from "@/app/api/programme/logo/route";
import { b64, jpeg, png } from "@/lib/org/test-images";
import { orgService, orgStore } from "@/lib/org/server";

const store = orgStore!;
const service = orgService!;
const good = { name: "Acme depot", welcome: { en: "Welcome to the Acme programme. You are not alone." }, contacts: [{ label: "EAP", phone: "9876543210" }] };
const picture = png(96, 96);
let code = "";
let n = 0;

const ask = (method: string, path: string, body?: unknown) => new NextRequest(`https://recoverly.co.in${path}`, { method, headers: { authorization: "Bearer t", "content-type": "application/json", "x-forwarded-for": `198.51.100.${n}` }, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = { params: Promise.resolve({ code: "" }) };
const withCode = () => ({ params: Promise.resolve({ code }) });

beforeEach(async () => {
  n += 1;
  process.env.OWNER_UIDS = "owner-1";
  env.user = { uid: "org-1", email: null, emailVerified: false };
  if (!code) {
    await service.createOrg(env.user, { name: "Acme", kind: "workplace", acceptTerms: true });
    await store.updateOrg("org-1", (o) => (o ? { ...o, subscription: { source: "stripe", plan: "workplace", status: "active", currentPeriodEnd: Date.now() + 20 * DAY_MS, cancelAtPeriodEnd: false, updatedAt: 1 } } : null));
    code = (await service.createProgramme("org-1", good)).code;
    void ctx;
  }
});

describe("sending a logo", () => {
  it("asks for a sign-in, checks the picture, and keeps it as a draft", async () => {
    env.user = null;
    expect((await sendLogo(ask("PUT", `/api/org/programmes/${code}/logo`, { type: "png", data: b64(picture) }), withCode())).status).toBe(401);
    env.user = { uid: "org-1", email: null, emailVerified: false };

    const fake = await sendLogo(ask("PUT", `/api/org/programmes/${code}/logo`, { type: "png", data: b64(jpeg(100, 100)) }), withCode());
    expect(fake.status).toBe(400);
    expect((await fake.json()).message).toMatch(/not a real PNG or JPEG/);
    const svg = await sendLogo(ask("PUT", `/api/org/programmes/${code}/logo`, { type: "svg", data: b64(Buffer.from("<svg></svg>")) }), withCode());
    expect(svg.status).toBe(400);

    const ok = await sendLogo(ask("PUT", `/api/org/programmes/${code}/logo`, { type: "png", data: b64(picture) }), withCode());
    expect(ok.status).toBe(200);
    expect((await ok.json()).programme.logo).toEqual({ live: false, draft: true });
  });

  it("refuses a body that is far too large", async () => {
    const response = await sendLogo(ask("PUT", `/api/org/programmes/${code}/logo`, { type: "png", data: "A".repeat(200_000) }), withCode());
    expect(response.status).toBe(413);
  });
});

describe("what people are shown", () => {
  it("is a 404 until the owner has approved the logo, and then the picture itself, served as nothing but a picture", async () => {
    expect((await publicLogo(ask("GET", `/api/programme/logo?code=${code}`))).status).toBe(404);
    await service.reviewProgramme(code, "approve");
    const response = await publicLogo(ask("GET", `/api/programme/logo?code=${code.toLowerCase()}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(Buffer.from(await response.arrayBuffer()).equals(picture)).toBe(true);
  });

  it("is a plain 404, the same for every reason, for a code that is not a programme with a logo", async () => {
    for (const query of ["", "?code=", "?code=!!", "?code=NOSUCHCODE22", "?code=SAMPLE"]) {
      const response = await publicLogo(ask("GET", `/api/programme/logo${query}`));
      expect(response.status, query).toBe(404);
      expect(await response.text()).toBe("");
    }
  });

  it("closes with the plan: a lapsed organisation's logo is gone from the public address at once", async () => {
    await store.updateOrg("org-1", (o) => (o && o.subscription ? { ...o, subscription: { ...o.subscription, status: "canceled" } } : o));
    expect((await publicLogo(ask("GET", `/api/programme/logo?code=${code}`))).status).toBe(404);
    await store.updateOrg("org-1", (o) => (o && o.subscription ? { ...o, subscription: { ...o.subscription, status: "active" } } : o));
    expect((await publicLogo(ask("GET", `/api/programme/logo?code=${code}`))).status).toBe(200);
  });
});

describe("looking at a logo before it is live", () => {
  it("lets the organisation see its own, and the owner see any, and nobody else see a draft", async () => {
    await service.setLogo("org-1", code, { type: "png", data: b64(png(64, 64)) });
    const own = await ownLogo(ask("GET", `/api/org/programmes/${code}/logo?which=draft`), withCode());
    expect(own.status).toBe(200);
    expect(own.headers.get("cache-control")).toBe("no-store");
    expect(own.headers.get("content-type")).toBe("image/png");

    env.user = { uid: "someone-else", email: null, emailVerified: false };
    expect((await ownLogo(ask("GET", `/api/org/programmes/${code}/logo`), withCode())).status).toBe(404);
    expect((await ownerLogo(ask("GET", `/api/owner/logo?code=${code}&which=draft`))).status).toBe(404);

    env.user = { uid: "owner-1", email: null, emailVerified: false };
    const draft = await ownerLogo(ask("GET", `/api/owner/logo?code=${code}&which=draft`));
    expect(draft.status).toBe(200);
    expect(draft.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await draft.arrayBuffer()).equals(png(64, 64))).toBe(true);
    // The one people are shown now (approved earlier) is a different picture from the one waiting.
    const live = await ownerLogo(ask("GET", `/api/owner/logo?code=${code}&which=live`));
    expect(Buffer.from(await live.arrayBuffer()).equals(picture)).toBe(true);
    expect((await ownerLogo(ask("GET", "/api/owner/logo?code=NOSUCHCODE22&which=draft"))).status).toBe(404);
  });

  it("can be removed by its organisation, and then it is gone for everyone", async () => {
    env.user = { uid: "org-1", email: null, emailVerified: false };
    expect((await removeLogo(ask("DELETE", `/api/org/programmes/${code}/logo`), withCode())).status).toBe(200);
    expect((await publicLogo(ask("GET", `/api/programme/logo?code=${code}`))).status).toBe(404);
    expect((await ownLogo(ask("GET", `/api/org/programmes/${code}/logo`), withCode())).status).toBe(404);
  });
});
