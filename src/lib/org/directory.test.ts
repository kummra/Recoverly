import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { DAY_MS, type Subscription } from "@/lib/billing/entitlement";
import { createDirectory } from "@/lib/org/directory";
import { memoryOrgStore } from "@/lib/org/memory-store";
import { NO_FEATURES, type OrgProgrammeRecord, type OrgRecord } from "@/lib/org/model";
import { b64, png } from "@/lib/org/test-images";
import { hashReportKey } from "@/lib/programme-register";

const NOW = 1_800_000_000_000;
const REPORT = "r".repeat(43);
const ROLLUP = "g".repeat(43);
const content = { name: "Acme depot", welcome: { en: "Welcome to the Acme programme." }, contacts: [{ label: "EAP", phone: "9876543210" }] };
const sub = (plan: Subscription["plan"], over: Partial<Subscription> = {}): Subscription => ({ source: "stripe", plan, status: "active", currentPeriodEnd: NOW + 20 * DAY_MS, cancelAtPeriodEnd: false, updatedAt: 1, ...over });
const org = (over: Partial<OrgRecord> = {}): OrgRecord => ({ id: "u1", name: "Acme", kind: "workplace", contactEmail: null, kindVerified: false, createdAt: 1, updatedAt: 1, termsAcceptedAt: 1, termsVersion: "2026-11", subscription: sub("workplace"), purchases: [], ...over });
const programme = (over: Partial<OrgProgrammeRecord> = {}): OrgProgrammeRecord => ({ code: "ACME2345XY", ownerUid: "u1", createdAt: 1, updatedAt: 1, content, draft: content, reviewState: "approved", features: { ...NO_FEATURES }, ...over });
const reporting = (over: Partial<OrgProgrammeRecord> = {}) => programme({ features: { ...NO_FEATURES, headcount: true }, reportKeyHash: hashReportKey(REPORT), ...over });
const publicJwk = () => generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ format: "jwk" });

async function directoryWith(orgs: OrgRecord[], programmes: OrgProgrammeRecord[], now = NOW) {
  const store = memoryOrgStore();
  for (const o of orgs) await store.createOrg(o);
  for (const p of programmes) await store.createProgramme(p);
  return { store, directory: createDirectory({ store, now: () => now }) };
}

describe("the in-code register comes first and costs nothing", () => {
  it("answers the sample programme, with or without a database", async () => {
    for (const store of [null, memoryOrgStore()]) {
      const directory = createDirectory({ store });
      expect((await directory.findProgramme("sample"))?.name).toBe("Sample organisation");
      expect((await directory.findWorkspaceTeam("SAMPLE"))?.practice).toBe(true);
    }
  });

  it("finds nothing for a code that is not anywhere, or that is not a code", async () => {
    const { directory } = await directoryWith([org()], []);
    expect(await directory.findProgramme("NOTHERE222")).toBeNull();
    expect(await directory.findProgramme("no")).toBeNull();
    expect(await directory.findProgramme(42)).toBeNull();
    expect(await createDirectory({ store: null }).findProgramme("ACME2345XY")).toBeNull();
  });
});

describe("a paying organisation's programme", () => {
  it("is found by its code once approved, with the words it was approved with", async () => {
    const { directory } = await directoryWith([org()], [programme()]);
    expect(await directory.findProgramme("acme-2345-xy")).toMatchObject({ code: "ACME2345XY", name: "Acme depot", kind: "workplace", contacts: [{ label: "EAP", phone: "9876543210" }] });
  });

  it("is not shown before the owner approves it, and keeps showing the approved words while a newer draft waits", async () => {
    const waiting = await directoryWith([org()], [programme({ content: null, reviewState: "pending" })]);
    expect(await waiting.directory.findProgramme("ACME2345XY")).toBeNull();
    const newer = await directoryWith([org()], [programme({ draft: { ...content, name: "Scam line" }, reviewState: "pending" })]);
    expect((await newer.directory.findProgramme("ACME2345XY"))?.name).toBe("Acme depot");
  });

  it("stops being found the moment the plan lapses, is not found on a plan meant for another kind, and is found again on renewal", async () => {
    const lapsed = await directoryWith([org({ subscription: sub("workplace", { status: "canceled" }) })], [programme()]);
    expect(await lapsed.directory.findProgramme("ACME2345XY")).toBeNull();
    const ended = await directoryWith([org({ subscription: sub("workplace", { currentPeriodEnd: NOW - 10 * DAY_MS }) })], [programme()]);
    expect(await ended.directory.findProgramme("ACME2345XY")).toBeNull();
    const none = await directoryWith([org({ subscription: null })], [programme()]);
    expect(await none.directory.findProgramme("ACME2345XY")).toBeNull();
    const wrong = await directoryWith([org({ kind: "community", subscription: sub("workplace") })], [programme()]);
    expect(await wrong.directory.findProgramme("ACME2345XY")).toBeNull();
    await lapsed.store.updateOrg("u1", (o) => (o ? { ...o, subscription: sub("workplace") } : null));
    expect(await lapsed.directory.findProgramme("ACME2345XY")).not.toBeNull();
  });

  it("passes the organisation's list of local referrals through to its people, cleaned, with the words that were approved", async () => {
    const referral = { name: "District de-addiction centre", place: "Civil Lines, Pune", phone: "02025550100" };
    const { directory } = await directoryWith([org()], [programme({ content: { ...content, referrals: [referral] }, draft: { ...content, referrals: [referral, { name: "Unapproved", place: "Elsewhere" }] } })]);
    expect((await directory.findProgramme("ACME2345XY"))?.referrals).toEqual([referral]);
    const plain = await directoryWith([org()], [programme()]);
    expect(await plain.directory.findProgramme("ACME2345XY")).not.toHaveProperty("referrals");
  });

  it("offers the anonymous counts only while they are switched on and in the plan, and never hands out the report key", async () => {
    const off = await directoryWith([org()], [programme()]);
    expect(await off.directory.findProgramme("ACME2345XY")).not.toHaveProperty("headcount");
    const on = await directoryWith([org()], [reporting({ features: { headcount: true, figures: true, challenge: true, workspace: false } })]);
    const found = await on.directory.findProgramme("ACME2345XY");
    expect(found).toMatchObject({ headcount: true, figures: true, challenge: true });
    expect(JSON.stringify(found)).not.toContain(hashReportKey(REPORT));
    const orphan = await directoryWith([org()], [programme({ features: { headcount: true, figures: false, challenge: false, workspace: false } })]);
    expect(await orphan.directory.findProgramme("ACME2345XY")).not.toHaveProperty("headcount");
  });
});

describe("the logo", () => {
  const logo = { type: "png" as const, data: b64(png(64, 64)), width: 64, height: 64 };

  it("is flagged on the programme and served only while the programme is live on a plan that has logos", async () => {
    const live = await directoryWith([org()], [programme({ logo })]);
    expect(await live.directory.findProgramme("ACME2345XY")).toMatchObject({ logo: true });
    expect(await live.directory.findLogo("acme-2345-xy")).toEqual(logo);

    const none = await directoryWith([org()], [programme()]);
    expect(await none.directory.findProgramme("ACME2345XY")).not.toHaveProperty("logo");
    expect(await none.directory.findLogo("ACME2345XY")).toBeNull();
  });

  it("is never shown while only a draft, before approval, after a lapse, or for a code that is not one", async () => {
    const draftOnly = await directoryWith([org()], [programme({ draftLogo: logo })]);
    expect(await draftOnly.directory.findLogo("ACME2345XY")).toBeNull();
    expect(await draftOnly.directory.findProgramme("ACME2345XY")).not.toHaveProperty("logo");
    const unapproved = await directoryWith([org()], [programme({ logo, content: null, reviewState: "pending" })]);
    expect(await unapproved.directory.findLogo("ACME2345XY")).toBeNull();
    const lapsed = await directoryWith([org({ subscription: sub("workplace", { status: "canceled" }) })], [programme({ logo })]);
    expect(await lapsed.directory.findLogo("ACME2345XY")).toBeNull();
    const served = await directoryWith([org()], [programme({ logo })]);
    expect(await served.directory.findLogo("no")).toBeNull();
    expect(await served.directory.findLogo(42)).toBeNull();
    expect(await createDirectory({ store: null }).findLogo("ACME2345XY")).toBeNull();
    expect(await createDirectory({ store: memoryOrgStore() }).findLogo("ACME2345XY")).toBeNull();
  });

  it("is not part of the team's private pages, which need only a name", async () => {
    const { directory } = await directoryWith([org()], [reporting({ logo })]);
    expect((await directory.findProgrammeByReportKey(REPORT))?.logo).toBeUndefined();
  });
});

describe("the team workspace", () => {
  const clinic = (over: Partial<OrgRecord> = {}) => org({ kind: "clinic", kindVerified: true, subscription: sub("clinic"), ...over });
  const workspace = (key?: JsonWebKey) => reporting({ features: { headcount: true, figures: false, challenge: false, workspace: true }, ...(key ? { workspacePublicKey: key } : {}) });

  it("is offered to people only once a verified clinic's team has a key on file", async () => {
    const noKey = await directoryWith([clinic()], [workspace()]);
    expect(await noKey.directory.findWorkspaceTeam("ACME2345XY")).toBeNull();
    expect(await noKey.directory.findProgramme("ACME2345XY")).not.toHaveProperty("workspace");
    const withKey = await directoryWith([clinic()], [workspace(publicJwk())]);
    const team = await withKey.directory.findWorkspaceTeam("ACME2345XY");
    expect(team).toMatchObject({ code: "ACME2345XY", practice: false });
    expect(team?.keyId).toMatch(/^[0-9a-f]{20}$/);
    expect(await withKey.directory.findProgramme("ACME2345XY")).toMatchObject({ workspace: true });
  });

  it("is never offered for an unverified organisation, or for an employer or a college even if everything else is in order", async () => {
    const unverified = await directoryWith([clinic({ kindVerified: false })], [workspace(publicJwk())]);
    expect(await unverified.directory.findWorkspaceTeam("ACME2345XY")).toBeNull();
    for (const kind of ["workplace", "college"] as const) {
      const employer = await directoryWith([org({ kind, kindVerified: true, subscription: sub("network") })], [workspace(publicJwk())]);
      expect(await employer.directory.findWorkspaceTeam("ACME2345XY")).toBeNull();
      expect(await employer.directory.findProgramme("ACME2345XY")).not.toHaveProperty("workspace");
      expect(await employer.directory.findWorkspaceByReportKey(REPORT)).toBeNull();
    }
  });

  it("gives the team its own page before the key is sent, so it can make one, and stops with the plan", async () => {
    const { directory, store } = await directoryWith([clinic()], [workspace()]);
    expect(await directory.findWorkspaceByReportKey(REPORT)).toMatchObject({ code: "ACME2345XY", publicKey: null, practice: false });
    await store.updateOrg("u1", (o) => (o ? { ...o, subscription: sub("clinic", { status: "canceled" }) } : null));
    expect(await directory.findWorkspaceByReportKey(REPORT)).toBeNull();
  });
});

describe("private report links", () => {
  it("find the programme for its own team even before the first approval, and not for anyone with a guess", async () => {
    const { directory } = await directoryWith([org()], [reporting({ content: null, reviewState: "pending" })]);
    expect((await directory.findProgrammeByReportKey(REPORT))?.name).toBe("Acme depot");
    expect(await directory.findProgrammeByReportKey("x".repeat(43))).toBeNull();
    expect(await directory.findProgrammeByReportKey("short")).toBeNull();
    expect(await directory.findProgrammeByReportKey(null)).toBeNull();
  });

  it("do not work while the report is switched off, or the plan has lapsed, and the organisation can be told why", async () => {
    const off = await directoryWith([org()], [programme({ reportKeyHash: hashReportKey(REPORT) })]);
    expect(await off.directory.findProgrammeByReportKey(REPORT)).toBeNull();
    const lapsed = await directoryWith([org({ subscription: sub("workplace", { status: "canceled" }) })], [reporting()]);
    expect(await lapsed.directory.findProgrammeByReportKey(REPORT)).toBeNull();
    expect(await lapsed.directory.findLapsedByKey(REPORT)).toEqual({ name: "Acme depot" });
    const live = await directoryWith([org()], [reporting()]);
    expect(await live.directory.findLapsedByKey(REPORT)).toBeNull();
    expect(await live.directory.findLapsedByKey("y".repeat(43))).toBeNull();
  });
});

describe("the roll-up across programmes", () => {
  const network = (over: Partial<OrgRecord> = {}) => org({ kind: "community", subscription: sub("network"), rollupKeyHash: hashReportKey(ROLLUP), ...over });

  it("adds up only the programmes whose report is on, under the organisation's name", async () => {
    const { directory } = await directoryWith([network()], [reporting({ code: "DIST1AAAAA", reportKeyHash: hashReportKey("a".repeat(43)) }), reporting({ code: "DIST2AAAAA", reportKeyHash: hashReportKey("b".repeat(43)) }), programme({ code: "DIST3AAAAA" })]);
    const found = await directory.findGroupByKey(ROLLUP);
    expect(found?.group.name).toBe("Acme");
    expect(found?.members.map((m) => m.code).sort()).toEqual(["DIST1AAAAA", "DIST2AAAAA"]);
  });

  it("needs the network plan and an active account, and a lapsed one can be told why", async () => {
    const small = await directoryWith([network({ subscription: sub("clinic") })], [reporting()]);
    expect(await small.directory.findGroupByKey(ROLLUP)).toBeNull();
    const lapsed = await directoryWith([network({ subscription: sub("network", { status: "canceled" }) })], [reporting()]);
    expect(await lapsed.directory.findGroupByKey(ROLLUP)).toBeNull();
    expect(await lapsed.directory.findLapsedByKey(ROLLUP)).toEqual({ name: "Acme" });
    expect(await createDirectory({ store: null }).findGroupByKey(ROLLUP)).toBeNull();
  });
});
