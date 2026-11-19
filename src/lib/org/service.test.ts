import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { DAY_MS, type Subscription } from "@/lib/billing/entitlement";
import { memoryOrgStore } from "@/lib/org/memory-store";
import { OrgError, createOrgService, generateCode, generateKey } from "@/lib/org/service";
import { hashReportKey } from "@/lib/programme-register";

const NOW = 1_800_000_000_000;
const user = (uid = "u1", over: Partial<{ email: string | null; emailVerified: boolean }> = {}) => ({ uid, email: "owner@acme.example" as string | null, emailVerified: true, ...over });
const good = { name: "Acme depot", welcome: { en: "Welcome to the Acme programme. You are not alone." }, contacts: [{ label: "Employee assistance line", phone: "9876543210", hours: "Mon to Sat, 9 to 6" }] };

function setup(now = NOW) {
  const store = memoryOrgStore();
  let codes = 0;
  let keys = 0;
  const service = createOrgService({ store, now: () => now, code: () => `CODE${String(++codes).padStart(6, "0")}`.replace(/0/g, "A").replace(/1/g, "B"), key: () => `key-number-${++keys}-`.padEnd(43, "x") });
  return { store, service };
}

const active = (plan: Subscription["plan"], over: Partial<Subscription> = {}): Subscription => ({ source: "stripe", plan, status: "active", currentPeriodEnd: NOW + 20 * DAY_MS, cancelAtPeriodEnd: false, updatedAt: NOW, ...over });

async function orgWith(kind: "workplace" | "college" | "clinic" | "community", plan: Subscription["plan"] | null, verified = false, uid = "u1") {
  const ctx = setup();
  await ctx.service.createOrg(user(uid), { name: "Acme", kind, acceptTerms: true });
  await ctx.store.updateOrg(uid, (o) => (o ? { ...o, kindVerified: verified, subscription: plan ? active(plan) : null } : null));
  return ctx;
}

const expectError = async (promise: Promise<unknown>, code: string, text?: RegExp) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(OrgError);
  expect((error as OrgError).code).toBe(code);
  if (text) expect((error as OrgError).message).toMatch(text);
};

describe("generated codes and keys", () => {
  it("make a code from letters and digits with nothing that looks like another, and a key long enough for a private link", () => {
    for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
    const key = generateKey();
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateKey()).not.toBe(key);
  });
});

describe("creating an organisation", () => {
  it("needs a name, a kind and the terms, and says what is missing", async () => {
    const { service } = setup();
    await expectError(service.createOrg(user(), { name: "A", kind: "workplace", acceptTerms: true }), "invalid", /name/i);
    await expectError(service.createOrg(user(), { name: "Acme", kind: "insurer", acceptTerms: true }), "invalid", /kind/i);
    await expectError(service.createOrg(user(), { name: "Acme", kind: "workplace", acceptTerms: false }), "invalid", /terms/i);
    await expectError(service.createOrg(user(), { name: "Acme", kind: "sample", acceptTerms: true }), "invalid", /kind/i);
  });

  it("keeps the sign-in address only when the account had verified it, and refuses a second organisation for one sign-in", async () => {
    const { service, store } = setup();
    const org = await service.createOrg(user("a"), { name: "  Acme   Logistics ", kind: "workplace", acceptTerms: true });
    expect(org).toMatchObject({ id: "a", name: "Acme Logistics", kind: "workplace", contactEmail: "owner@acme.example", kindVerified: false, subscription: null });
    await service.createOrg(user("b", { emailVerified: false }), { name: "Other", kind: "college", acceptTerms: true });
    expect((await store.getOrg("b"))?.contactEmail).toBeNull();
    await expectError(service.createOrg(user("a"), { name: "Again", kind: "workplace", acceptTerms: true }), "exists");
  });

  it("starts with no plan and offers only the plans that fit its kind", async () => {
    const { service } = await orgWith("college", null);
    const overview = await service.overview("u1");
    expect(overview?.access.active).toBe(false);
    expect(overview?.plans.map((p) => p.id)).toEqual(["workplace", "network"]);
    expect(overview?.workspaceEligible).toBe(false);
    expect(overview?.programmeLimit).toBeNull();
    expect(await service.overview("nobody")).toBeNull();
  });
});

describe("programmes need a plan, and a plan has a limit", () => {
  it("refuses everything that changes something until there is an active plan", async () => {
    const { service } = await orgWith("workplace", null);
    await expectError(service.createProgramme("u1", good), "no_access");
    await expectError(service.setFeatures("u1", "ANYCODE222", { headcount: true }), "no_access");
    await expectError(service.rollupKey("u1"), "no_access");
  });

  it("makes a programme as a draft waiting for review, with a code and nothing switched on", async () => {
    const { service } = await orgWith("workplace", "workplace");
    const programme = await service.createProgramme("u1", good);
    expect(programme.code).toMatch(/^CODE/);
    expect(programme).toMatchObject({ reviewState: "pending", live: null, features: { headcount: false, figures: false, challenge: false, workspace: false }, reportLinkOn: false });
    expect(programme.draft.name).toBe("Acme depot");
  });

  it("stops at the number of codes the plan covers", async () => {
    const { service } = await orgWith("clinic", "clinic");
    for (let i = 0; i < 3; i++) await service.createProgramme("u1", good);
    await expectError(service.createProgramme("u1", good), "limit", /3 programme codes/);
    const [first] = (await service.overview("u1"))!.programmes;
    await service.deleteProgramme("u1", first.code);
    await expect(service.createProgramme("u1", good)).resolves.toBeTruthy();
  });

  it("tells the organisation exactly what is wrong with what it typed, and saves nothing", async () => {
    const { service, store } = await orgWith("workplace", "workplace");
    const bad = { name: "Acme", welcome: { en: "short" }, contacts: [{ label: "Line", phone: "12" }, { label: "Web", url: "http://insecure.example" }] };
    const error = (await service.createProgramme("u1", bad).catch((e: unknown) => e)) as OrgError;
    expect(error.code).toBe("invalid");
    expect(error.details.join(" ")).toMatch(/welcome is too short/);
    expect(error.details.join(" ")).toMatch(/Contact 1.*3 to 15 digits/);
    expect(error.details.join(" ")).toMatch(/Contact 2.*https/);
    expect(store.programmes.size).toBe(0);
  });
});

describe("what people see is only what the owner approved", () => {
  it("keeps showing the approved words while a new draft waits, and shows nothing until a first approval", async () => {
    const { service, store } = await orgWith("workplace", "workplace");
    const { code } = await service.createProgramme("u1", good);
    expect((await store.getProgramme(code))?.content).toBeNull();

    await service.reviewProgramme(code, "approve");
    expect((await store.getProgramme(code))?.content?.name).toBe("Acme depot");
    expect((await store.getProgramme(code))?.reviewState).toBe("approved");

    await service.updateProgramme("u1", code, { ...good, name: "Acme depot North" });
    const waiting = await store.getProgramme(code);
    expect(waiting?.reviewState).toBe("pending");
    expect(waiting?.draft.name).toBe("Acme depot North");
    expect(waiting?.content?.name).toBe("Acme depot");
  });

  it("does not ask for a review again when the words saved are the ones already live", async () => {
    const { service, store } = await orgWith("workplace", "workplace");
    const { code } = await service.createProgramme("u1", good);
    await service.reviewProgramme(code, "approve");
    await service.updateProgramme("u1", code, { ...good, name: "Changed" });
    await service.updateProgramme("u1", code, good);
    expect((await store.getProgramme(code))?.reviewState).toBe("approved");
    await service.updateProgramme("u1", code, good);
    expect((await store.getProgramme(code))?.reviewState).toBe("approved");
  });

  it("lets the owner reject with a reason (people keep what they had) or take a programme down entirely", async () => {
    const { service, store } = await orgWith("workplace", "workplace");
    const { code } = await service.createProgramme("u1", good);
    await service.reviewProgramme(code, "approve");
    await service.updateProgramme("u1", code, { ...good, name: "Scam line" });
    await expectError(service.reviewProgramme(code, "reject", ""), "invalid", /why/i);
    await service.reviewProgramme(code, "reject", "That number is not yours.");
    expect(await store.getProgramme(code)).toMatchObject({ reviewState: "rejected", reviewNote: "That number is not yours." });
    expect((await store.getProgramme(code))?.content?.name).toBe("Acme depot");
    await service.reviewProgramme(code, "unpublish", "Taken down.");
    expect((await store.getProgramme(code))?.content).toBeNull();
    await expectError(service.reviewProgramme("MISSING222", "approve"), "not_found");
  });

  it("never lets one organisation read, change or delete another's programme, and says only that it was not found", async () => {
    const { service, store } = await orgWith("workplace", "workplace");
    await service.createOrg(user("u2"), { name: "Rival", kind: "workplace", acceptTerms: true });
    await store.updateOrg("u2", (o) => (o ? { ...o, subscription: active("workplace") } : null));
    const { code } = await service.createProgramme("u1", good);
    await expectError(service.updateProgramme("u2", code, good), "not_found");
    await expectError(service.deleteProgramme("u2", code), "not_found");
    await expectError(service.setFeatures("u2", code, { headcount: true }), "not_found");
    await expectError(service.rotateReportKey("u2", code), "not_found");
    expect((await service.overview("u2"))!.programmes).toEqual([]);
    expect(await store.getProgramme(code)).not.toBeNull();
  });
});

describe("the anonymous counts", () => {
  it("make the private report link when the report is switched on, show it once, and keep only its hash", async () => {
    const { service, store } = await orgWith("workplace", "workplace");
    const { code } = await service.createProgramme("u1", good);
    const on = await service.setFeatures("u1", code, { headcount: true });
    expect(on.reportKey).toMatch(/^key-number-1-x+$/);
    expect(on.programme.reportLinkOn).toBe(true);
    const stored = await store.getProgramme(code);
    expect(stored?.reportKeyHash).toBe(hashReportKey(on.reportKey!));
    expect(JSON.stringify(on.programme)).not.toContain(stored!.reportKeyHash!);
    // Switching something else does not make a new link.
    const more = await service.setFeatures("u1", code, { figures: true, challenge: true });
    expect(more.reportKey).toBeUndefined();
    expect(more.programme.features).toMatchObject({ headcount: true, figures: true, challenge: true });
    expect((await store.getProgramme(code))?.reportKeyHash).toBe(hashReportKey(on.reportKey!));
  });

  it("turns everything off with the report, and removes the link", async () => {
    const { service, store } = await orgWith("workplace", "workplace");
    const { code } = await service.createProgramme("u1", good);
    await service.setFeatures("u1", code, { headcount: true, figures: true, challenge: true });
    const off = await service.setFeatures("u1", code, { headcount: false });
    expect(off.programme.features).toEqual({ headcount: false, figures: false, challenge: false, workspace: false });
    expect((await store.getProgramme(code))?.reportKeyHash).toBeUndefined();
  });

  it("will not switch figures or the challenge on without the report", async () => {
    const { service } = await orgWith("workplace", "workplace");
    const { code } = await service.createProgramme("u1", good);
    const result = await service.setFeatures("u1", code, { figures: true, challenge: true });
    expect(result.programme.features).toEqual({ headcount: false, figures: false, challenge: false, workspace: false });
    expect(result.reportKey).toBeUndefined();
  });

  it("replaces the report link on request, and the old one stops matching", async () => {
    const { service, store } = await orgWith("workplace", "workplace");
    const { code } = await service.createProgramme("u1", good);
    await expectError(service.rotateReportKey("u1", code), "invalid", /report on first/i);
    const { reportKey: first } = await service.setFeatures("u1", code, { headcount: true });
    const { reportKey: second } = await service.rotateReportKey("u1", code);
    expect(second).not.toBe(first);
    expect((await store.getProgramme(code))?.reportKeyHash).toBe(hashReportKey(second));
    expect(await store.programmeByReportHash(hashReportKey(first!))).toBeNull();
  });
});

describe("the team workspace is only for a confirmed clinic or community service on a plan that has it", () => {
  it("is never offered to an employer or a college, even one the owner has verified and even on the biggest plan", async () => {
    for (const kind of ["workplace", "college"] as const) {
      const { service } = await orgWith(kind, "network", true);
      const { code } = await service.createProgramme("u1", good);
      await service.setFeatures("u1", code, { headcount: true });
      await expectError(service.setFeatures("u1", code, { workspace: true }), "forbidden", /clinics and community services/);
    }
  });

  it("is refused on a plan without it, and until the owner has confirmed the kind", async () => {
    const plain = await orgWith("clinic", "clinic", false);
    const { code } = await plain.service.createProgramme("u1", good);
    await plain.service.setFeatures("u1", code, { headcount: true });
    await expectError(plain.service.setFeatures("u1", code, { workspace: true }), "invalid", /we confirm the organisation first/);

  });

  it("is refused when the plan on the account is not one meant for that kind of organisation", async () => {
    const mismatched = await orgWith("community", "workplace", true);
    await expectError(mismatched.service.createProgramme("u1", good), "no_access", /not meant for this kind/);
  });

  it("switches on for a verified clinic, takes the team's public key from the signed-in owner only, and gives back the fingerprint", async () => {
    const { service, store } = await orgWith("clinic", "clinic", true);
    const { code } = await service.createProgramme("u1", good);
    await expectError(service.setWorkspaceKey("u1", code, {}), "invalid", /not a valid public key/);
    await service.setFeatures("u1", code, { headcount: true, workspace: true });

    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk = publicKey.export({ format: "jwk" });
    const { keyId } = await service.setWorkspaceKey("u1", code, jwk);
    expect(keyId).toMatch(/^[0-9a-f]{20}$/);
    expect((await store.getProgramme(code))?.workspacePublicKey).toMatchObject({ kty: "RSA", key_ops: ["encrypt"] });
    expect((await service.overview("u1"))!.programmes[0].workspaceKeyId).toBe(keyId);

    // The private half is refused outright: pasting the wrong file must never publish the key that opens everything.
    await expectError(service.setWorkspaceKey("u1", code, privateKey.export({ format: "jwk" })), "invalid", /private part/);
  });

  it("needs the workspace switched on for that programme before a key is accepted", async () => {
    const { service } = await orgWith("clinic", "clinic", true);
    const { code } = await service.createProgramme("u1", good);
    await service.setFeatures("u1", code, { headcount: true });
    const jwk = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ format: "jwk" });
    await expectError(service.setWorkspaceKey("u1", code, jwk), "invalid", /workspace on/i);
  });
});

describe("the roll-up across programmes", () => {
  it("is a private link made once, only on the network plan, and replaced when asked again", async () => {
    const small = await orgWith("community", "clinic");
    await expectError(small.service.rollupKey("u1"), "invalid", /roll-up/i);
    const { service, store } = await orgWith("community", "network");
    const first = await service.rollupKey("u1");
    expect((await store.getOrg("u1"))?.rollupKeyHash).toBe(hashReportKey(first.rollupKey));
    const second = await service.rollupKey("u1");
    expect(second.rollupKey).not.toBe(first.rollupKey);
    expect(await store.orgByRollupHash(hashReportKey(first.rollupKey))).toBeNull();
    expect((await service.overview("u1"))!.org.rollupOn).toBe(true);
  });
});

describe("the owner's controls", () => {
  it("lists organisations with their access and the programmes waiting for review", async () => {
    const { service } = await orgWith("workplace", "workplace");
    await service.createProgramme("u1", good);
    const overview = await service.ownerOverview();
    expect(overview.orgs[0]).toMatchObject({ id: "u1", name: "Acme", access: { active: true, plan: "workplace" } });
    expect(overview.pending).toHaveLength(1);
    expect(overview.pending[0]).toMatchObject({ orgName: "Acme", orgKind: "workplace", live: null });
  });

  it("switches a plan on by hand until a date, only for a plan that fits the kind, and never over a live card subscription", async () => {
    const { service, store } = await orgWith("workplace", null);
    await expectError(service.activateManual("u1", { plan: "gold", endsAt: NOW + DAY_MS }), "invalid", /plan/i);
    await expectError(service.activateManual("u1", { plan: "workplace", endsAt: NOW - DAY_MS }), "invalid", /future/);
    await expectError(service.activateManual("u1", { plan: "workplace", endsAt: NOW + 500 * DAY_MS }), "invalid", /400 days/);
    await expectError(service.activateManual("u1", { plan: "clinic", endsAt: NOW + DAY_MS }), "invalid", /not for this kind/);
    await expectError(service.activateManual("nobody", { plan: "workplace", endsAt: NOW + DAY_MS }), "not_found");

    await service.activateManual("u1", { plan: "workplace", endsAt: new Date(NOW + 30 * DAY_MS).toISOString(), note: "Invoice 14, paid by bank transfer" });
    expect((await store.getOrg("u1"))?.subscription).toMatchObject({ source: "manual", plan: "workplace", status: "active", currentPeriodEnd: NOW + 30 * DAY_MS, note: "Invoice 14, paid by bank transfer" });

    await store.updateOrg("u1", (o) => (o ? { ...o, subscription: active("workplace") } : null));
    await expectError(service.activateManual("u1", { plan: "workplace", endsAt: NOW + DAY_MS }), "conflict", /Stripe/);
    await expectError(service.deactivateManual("u1"), "conflict", /Stripe/);
  });

  it("ends a manual activation on request", async () => {
    const { service, store } = await orgWith("workplace", null);
    await service.activateManual("u1", { plan: "workplace", endsAt: NOW + 30 * DAY_MS });
    await service.deactivateManual("u1");
    expect((await store.getOrg("u1"))?.subscription?.status).toBe("canceled");
    expect((await service.overview("u1"))!.access.active).toBe(false);
  });

  it("confirms an organisation's kind, which is what the workspace waits for", async () => {
    const { service, store } = await orgWith("clinic", "clinic", false);
    await service.setKindVerified("u1", true);
    expect((await store.getOrg("u1"))?.kindVerified).toBe(true);
    await expectError(service.setKindVerified("nobody", true), "not_found");
  });
});

describe("renaming", () => {
  it("is allowed without a plan, and checked", async () => {
    const { service, store } = await orgWith("workplace", null);
    await service.rename("u1", "  New   Name ");
    expect((await store.getOrg("u1"))?.name).toBe("New Name");
    await expectError(service.rename("u1", "x"), "invalid");
  });
});
