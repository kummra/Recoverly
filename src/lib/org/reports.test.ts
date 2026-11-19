import { describe, expect, it, vi } from "vitest";

import { DAY_MS, type Subscription } from "@/lib/billing/entitlement";
import { resendMailer } from "@/lib/org/mailer";
import { memoryOrgStore } from "@/lib/org/memory-store";
import { NO_FEATURES, type OrgProgrammeRecord, type OrgRecord } from "@/lib/org/model";
import { type ReportMessage, monthlyReportText, sendMonthlyReports } from "@/lib/org/reports";
import { hashReportKey } from "@/lib/programme-register";

/** The second of December 2026: the report is for November. */
const NOW = new Date(2026, 11, 2, 9, 30);
const NOV = "2026-11";
const content = { name: "Acme depot", welcome: { en: "Welcome to the Acme programme." }, contacts: [] };
const sub = (plan: Subscription["plan"] = "workplace", over: Partial<Subscription> = {}): Subscription => ({ source: "stripe", plan, status: "active", currentPeriodEnd: NOW.getTime() + 20 * DAY_MS, cancelAtPeriodEnd: false, updatedAt: 1, ...over });
const org = (over: Partial<OrgRecord> = {}): OrgRecord => ({ id: "u1", name: "Acme", kind: "workplace", contactEmail: "owner@acme.example", kindVerified: false, createdAt: 1, updatedAt: 1, termsAcceptedAt: 1, termsVersion: "2026-11", subscription: sub(), purchases: [], emailReports: { on: true }, ...over });
const programme = (code: string, over: Partial<OrgProgrammeRecord> = {}): OrgProgrammeRecord => ({
  code,
  ownerUid: "u1",
  createdAt: 1,
  updatedAt: 1,
  content,
  draft: content,
  reviewState: "approved",
  features: { ...NO_FEATURES, headcount: true },
  reportKeyHash: hashReportKey(code.repeat(5)),
  ...over
});

function setup(orgs: OrgRecord[], programmes: OrgProgrammeRecord[], counts: Record<string, Record<string, number>>, mailResult: boolean | Error = true) {
  const store = memoryOrgStore();
  const sent: ReportMessage[] = [];
  const mail = vi.fn(async (message: ReportMessage) => {
    if (mailResult instanceof Error) throw mailResult;
    if (mailResult) sent.push(message);
    return mailResult;
  });
  const read = vi.fn(async (code: string) => counts[code] ?? {});
  const run = () => sendMonthlyReports({ store, counts: { read }, mail, now: NOW, portalUrl: "https://recoverly.co.in/portal" });
  return { store, sent, mail, read, run, seed: async () => { for (const o of orgs) await store.createOrg(o); for (const p of programmes) await store.createProgramme(p); } };
}

describe("the text of the email", () => {
  it("gives each programme's figure as the report page would, and nothing else about anyone", () => {
    const text = monthlyReportText("Acme", NOV, [{ programme: "North depot", display: { shown: true, value: 25 } }, { programme: "South depot", display: { shown: false } }], "https://recoverly.co.in/portal");
    expect(text).toContain("Acme: your Recoverly report for Nov 2026");
    expect(text).toContain("North depot: about 25 people were counted.");
    expect(text).toContain("South depot: fewer than 20 people were counted, so no figure is shown.");
    expect(text).toContain("nearest 5");
    expect(text).toContain("https://recoverly.co.in/portal");
    expect(text).not.toMatch(/partners\/report\//);
  });
});

describe("sending the monthly reports", () => {
  it("sends last month's rounded figure, once, only to the organisation's confirmed address", async () => {
    const t = setup([org()], [programme("AAAAAAAAAA"), programme("BBBBBBBBBB")], { AAAAAAAAAA: { [NOV]: 24, "2026-10": 99 }, BBBBBBBBBB: { [NOV]: 12 } });
    await t.seed();
    expect(await t.run()).toEqual({ considered: 1, sent: 1, skipped: 0, failed: 0 });
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0].to).toBe("owner@acme.example");
    expect(t.sent[0].subject).toBe("Your Recoverly report for Nov 2026");
    expect(t.sent[0].text).toContain("about 25 people were counted");
    expect(t.sent[0].text).toContain("fewer than 20 people were counted");
    expect(t.sent[0].text).not.toMatch(/\b(24|12|99)\b/);
    expect((await t.store.getOrg("u1"))?.emailReports).toEqual({ on: true, lastSentMonth: NOV });
  });

  it("does not send the same month twice, however many times it runs, even at once", async () => {
    const t = setup([org()], [programme("AAAAAAAAAA")], { AAAAAAAAAA: { [NOV]: 40 } });
    await t.seed();
    await Promise.all([t.run(), t.run(), t.run()]);
    expect(t.sent).toHaveLength(1);
    expect(await t.run()).toMatchObject({ sent: 0, skipped: 1 });
  });

  it("gives the month back when sending fails, so the next run tries again", async () => {
    const failing = setup([org()], [programme("AAAAAAAAAA")], {}, false);
    await failing.seed();
    expect(await failing.run()).toMatchObject({ sent: 0, failed: 1 });
    expect((await failing.store.getOrg("u1"))?.emailReports).toEqual({ on: true });
    const crashing = setup([org({ emailReports: { on: true, lastSentMonth: "2026-10" } })], [programme("AAAAAAAAAA")], {}, new Error("provider down"));
    await crashing.seed();
    expect(await crashing.run()).toMatchObject({ failed: 1 });
    expect((await crashing.store.getOrg("u1"))?.emailReports).toEqual({ on: true, lastSentMonth: "2026-10" });
  });

  it("skips an organisation that has it off, has no confirmed address, has no active plan, or has no report on", async () => {
    const cases: Array<[string, OrgRecord, OrgProgrammeRecord[]]> = [
      ["off", org({ emailReports: undefined }), [programme("AAAAAAAAAA")]],
      ["no address", org({ contactEmail: null }), [programme("AAAAAAAAAA")]],
      ["lapsed", org({ subscription: sub("workplace", { status: "canceled" }) }), [programme("AAAAAAAAAA")]],
      ["no plan", org({ subscription: null }), [programme("AAAAAAAAAA")]],
      ["wrong kind of plan", org({ kind: "community", subscription: sub("workplace") }), [programme("AAAAAAAAAA")]],
      ["no report on", org(), [programme("AAAAAAAAAA", { features: { ...NO_FEATURES }, reportKeyHash: undefined })]],
      ["no programmes", org(), []]
    ];
    for (const [name, o, ps] of cases) {
      const t = setup([o], ps, { AAAAAAAAAA: { [NOV]: 50 } });
      await t.seed();
      const summary = await t.run();
      expect(t.sent, name).toHaveLength(0);
      expect(summary.sent, name).toBe(0);
    }
  });

  it("sends to each organisation separately and reads only the counts of its own programmes", async () => {
    const t = setup([org(), org({ id: "u2", name: "Beta", contactEmail: "beta@b.example" })], [programme("AAAAAAAAAA"), programme("CCCCCCCCCC", { ownerUid: "u2" })], { AAAAAAAAAA: { [NOV]: 30 }, CCCCCCCCCC: { [NOV]: 60 } });
    await t.seed();
    expect(await t.run()).toMatchObject({ considered: 2, sent: 2 });
    expect(t.sent.map((m) => m.to).sort()).toEqual(["beta@b.example", "owner@acme.example"]);
    expect(t.sent.find((m) => m.to === "beta@b.example")?.text).toContain("about 60 people");
    expect(t.sent.find((m) => m.to === "beta@b.example")?.text).not.toContain("about 30 people");
  });
});

describe("the mailer", () => {
  const env = { RESEND_API_KEY: "re_test_key", REPORTS_FROM_EMAIL: "Recoverly <reports@recoverly.co.in>" };

  it("is off without both settings or with a from address that is not one", () => {
    expect(resendMailer({})).toBeNull();
    expect(resendMailer({ RESEND_API_KEY: "re_x" })).toBeNull();
    expect(resendMailer({ REPORTS_FROM_EMAIL: "a@b.co" })).toBeNull();
    expect(resendMailer({ ...env, REPORTS_FROM_EMAIL: "not an address" })).toBeNull();
    expect(resendMailer({ ...env, REPORTS_FROM_EMAIL: "Evil <a@b.co>\nBcc: x@y.z" })).toBeNull();
  });

  it("posts the message to Resend with the key, and says whether it was accepted", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    const mailer = resendMailer(env, fetchImpl as unknown as typeof fetch);
    expect(await mailer!({ to: "o@acme.example", subject: "S", text: "T" })).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");
    expect(JSON.parse(init.body as string)).toEqual({ from: "Recoverly <reports@recoverly.co.in>", to: ["o@acme.example"], subject: "S", text: "T" });
    expect(await resendMailer(env, (async () => new Response("no", { status: 422 })) as unknown as typeof fetch)!({ to: "a@b.co", subject: "S", text: "T" })).toBe(false);
    expect(await resendMailer(env, (async () => Promise.reject(new Error("offline"))) as unknown as typeof fetch)!({ to: "a@b.co", subject: "S", text: "T" })).toBe(false);
  });
});
