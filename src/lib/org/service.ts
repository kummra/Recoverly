/**
 * What an organisation (and the owner) can do in the portal, as rules over an `OrgStore`. Server only.
 *
 * The things this file is careful about, because each is a way a self-serve system could hurt someone:
 *
 *  - Nothing an organisation writes reaches its people until the owner has approved it (`reviewProgramme`).
 *    A stranger cannot put a number in front of someone looking for help.
 *  - The team workspace hands over individual-level data, by each person's own act. It needs a plan that has
 *    it, a clinic or community kind, and the owner's confirmation that the organisation really is that kind
 *    (`kindVerified`). An employer or a college can never have it, whatever they type (`workspaceAllowedFor`).
 *  - Secret links (the report, the roll-up) are made here from random bytes, shown once, and only their hash
 *    is stored.
 *  - Every change needs an active plan, except looking, deleting and renaming.
 */
import { randomBytes, randomInt } from "node:crypto";

import { PLANS, type PlanId, isOrgKind, isPlanId, planAllows, planFitsKind, plansForKind } from "@/lib/billing/catalogue";
import { type Subscription, accessSummary, hasAccess } from "@/lib/billing/entitlement";
import { checkProgrammeContent } from "@/lib/org/content";
import { OrgError } from "@/lib/org/errors";
import { checkLogo } from "@/lib/org/logo";
import type { StoredLogo } from "@/lib/org/logo-model";
import {
  NO_FEATURES,
  ORG_LIMITS,
  ORG_TERMS_VERSION,
  type OrgProgrammeRecord,
  type OrgRecord,
  type OwnerOrgRow,
  type PortalOrg,
  type PortalOverview,
  type PortalProgramme,
  type ProgrammeFeatures,
  type ProgrammeSummary
} from "@/lib/org/model";
import type { OrgStore } from "@/lib/org/store";
import { type ProgrammeContent, cleanText } from "@/lib/programme";
import { PROGRAMMES, hashReportKey, workspaceKeyId } from "@/lib/programme-register";
import { cleanPublicKey, workspaceAllowedFor } from "@/lib/workspace";

export { ORG_ERROR_STATUS, OrgError, type OrgErrorCode } from "@/lib/org/errors";

export type SignedInUser = { uid: string; email: string | null; emailVerified: boolean };

export type { OwnerOrgRow, PlanOffer, PortalOrg, PortalOverview, ProgrammeSummary } from "@/lib/org/model";

/** Letters and digits with nothing that looks like another (no I, O, 0 or 1): a code is read off a poster and typed. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const GENERATED_CODE_LENGTH = 10;

export function generateCode(pick: (max: number) => number = randomInt): string {
  let code = "";
  for (let i = 0; i < GENERATED_CODE_LENGTH; i++) code += CODE_ALPHABET[pick(CODE_ALPHABET.length)];
  return code;
}

/** A private link's secret: 256 random bits, 43 URL-safe characters. Shown once; only its hash is kept. */
export function generateKey(bytes: () => Buffer = () => randomBytes(32)): string {
  return bytes().toString("base64url");
}

const FEATURE_KEYS = ["headcount", "figures", "challenge", "workspace", "pulse"] as const;
const sameContent = (a: ProgrammeContent | null, b: ProgrammeContent | null) => JSON.stringify(a) === JSON.stringify(b);

export type OrgServiceDeps = {
  store: OrgStore;
  now?: () => number;
  code?: () => string;
  key?: () => string;
};

export function createOrgService(deps: OrgServiceDeps) {
  const { store } = deps;
  const now = deps.now ?? Date.now;
  const newCode = deps.code ?? (() => generateCode());
  const newKey = deps.key ?? (() => generateKey());

  async function requireOrg(uid: string): Promise<OrgRecord> {
    const org = await store.getOrg(uid);
    if (!org) throw new OrgError("not_found", "Create your organisation first.");
    return org;
  }

  /** The organisation and the plan it is on, or a refusal that says a plan is needed. */
  async function requireActive(uid: string): Promise<{ org: OrgRecord; plan: PlanId }> {
    const org = await requireOrg(uid);
    if (!hasAccess(org.subscription, now()) || !org.subscription) throw new OrgError("no_access", "An active plan is needed for this. Choose a plan first.");
    if (!planFitsKind(org.subscription.plan, org.kind)) throw new OrgError("no_access", "The plan on this account is not meant for this kind of organisation. Contact us and we will put it right.");
    return { org, plan: org.subscription.plan };
  }

  function portalProgramme(record: OrgProgrammeRecord): PortalProgramme {
    const key = record.workspacePublicKey ? cleanPublicKey(record.workspacePublicKey) : null;
    const portal: PortalProgramme = {
      code: record.code,
      draft: record.draft,
      live: record.content,
      reviewState: record.reviewState,
      features: record.features,
      reportLinkOn: record.features.headcount && Boolean(record.reportKeyHash),
      workspaceKeyId: key ? workspaceKeyId(key) : null,
      logo: { live: Boolean(record.logo), draft: Boolean(record.draftLogo) },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
    if (record.reviewNote) portal.reviewNote = record.reviewNote;
    return portal;
  }

  /** Find a programme that belongs to this owner, or say it does not exist (never say who it belongs to). */
  async function ownProgramme(uid: string, code: string): Promise<OrgProgrammeRecord> {
    const record = await store.getProgramme(code);
    if (!record || record.ownerUid !== uid) throw new OrgError("not_found", "That programme was not found.");
    return record;
  }

  function portalOrg(org: OrgRecord): PortalOrg {
    return { name: org.name, kind: org.kind, contactEmail: org.contactEmail, kindVerified: org.kindVerified, createdAt: org.createdAt, termsVersion: org.termsVersion, purchases: org.purchases, rollupOn: Boolean(org.rollupKeyHash), emailReports: Boolean(org.emailReports?.on) };
  }

  /** Words that use a feature the plan does not include are refused, not quietly dropped: the organisation should know they are not shown. */
  function refuseWhatThePlanLacks(content: ProgrammeContent, plan: PlanId): void {
    if (content.referrals?.length && !planAllows(plan, "referrals")) throw new OrgError("invalid", "Your plan does not include the list of local referrals.");
  }

  /** Why the team workspace cannot be switched on for this organisation on this plan, or `null` if it can. */
  function workspaceRefusal(org: OrgRecord, plan: PlanId): OrgError | null {
    if (!planAllows(plan, "workspace")) return new OrgError("invalid", "Your plan does not include the team workspace.");
    if (!workspaceAllowedFor(org.kind)) {
      return new OrgError("forbidden", "The team workspace is only for clinics and community services. In a workplace or a college a person cannot freely say no to their own employer or institution, so it is never offered there.");
    }
    if (!org.kindVerified) return new OrgError("invalid", "The team workspace hands a team individual progress, so we confirm the organisation first. Contact us and we will check it and switch this on.");
    return null;
  }

  return {
    // ─── The organisation ───────────────────────────────────────────

    async createOrg(user: SignedInUser, input: { name?: unknown; kind?: unknown; acceptTerms?: unknown }): Promise<OrgRecord> {
      const name = cleanText(input.name, ORG_LIMITS.nameMax);
      const errors: string[] = [];
      if (name.length < ORG_LIMITS.nameMin) errors.push(`Give your organisation a name of at least ${ORG_LIMITS.nameMin} characters.`);
      if (!isOrgKind(input.kind)) errors.push("Choose what kind of organisation this is.");
      if (input.acceptTerms !== true) errors.push("Accept the organisation terms to continue.");
      if (errors.length || !isOrgKind(input.kind)) throw new OrgError("invalid", errors[0] ?? "Check the form.", errors);

      const at = now();
      const org: OrgRecord = {
        id: user.uid,
        name,
        kind: input.kind,
        contactEmail: user.emailVerified && user.email ? user.email.slice(0, ORG_LIMITS.emailMax) : null,
        kindVerified: false,
        createdAt: at,
        updatedAt: at,
        termsAcceptedAt: at,
        termsVersion: ORG_TERMS_VERSION,
        subscription: null,
        purchases: []
      };
      if (!(await store.createOrg(org))) throw new OrgError("exists", "This sign-in already has an organisation.");
      return org;
    },

    async overview(uid: string): Promise<PortalOverview | null> {
      const org = await store.getOrg(uid);
      if (!org) return null;
      const programmes = (await store.programmesByOwner(uid)).sort((a, b) => a.createdAt - b.createdAt);
      const access = accessSummary(org.subscription, now());
      return {
        org: portalOrg(org),
        access,
        programmes: programmes.map(portalProgramme),
        programmeLimit: access.active && access.plan ? PLANS[access.plan].programmes : null,
        plans: plansForKind(org.kind).map((plan) => ({ id: plan.id, name: plan.name, audience: plan.audience, programmes: plan.programmes, features: plan.features })),
        workspaceEligible: workspaceAllowedFor(org.kind) && plansForKind(org.kind).some((plan) => planAllows(plan.id, "workspace"))
      };
    },

    async rename(uid: string, name: unknown): Promise<void> {
      const clean = cleanText(name, ORG_LIMITS.nameMax);
      if (clean.length < ORG_LIMITS.nameMin) throw new OrgError("invalid", `Give your organisation a name of at least ${ORG_LIMITS.nameMin} characters.`);
      await requireOrg(uid);
      await store.updateOrg(uid, (org) => (org ? { ...org, name: clean, updatedAt: now() } : null));
    },

    /**
     * Switch the monthly report email on or off. It goes only to the organisation's confirmed sign-in address, so turning it on
     * needs one; and it needs a plan that has it. Turning it off needs neither.
     */
    async setEmailReports(uid: string, on: unknown): Promise<void> {
      if (typeof on !== "boolean") throw new OrgError("invalid", "Say whether to switch it on or off.");
      if (!on) {
        await requireOrg(uid);
        await store.updateOrg(uid, (org) => (org ? { ...org, emailReports: undefined, updatedAt: now() } : null));
        return;
      }
      const { org, plan } = await requireActive(uid);
      if (!planAllows(plan, "emailReports")) throw new OrgError("invalid", "Your plan does not include the monthly report by email.");
      if (!org.contactEmail) throw new OrgError("invalid", "The report is sent to the confirmed email address on your sign-in, and yours has not been confirmed. Confirm it in Settings, then try again.");
      await store.updateOrg(uid, (current) => (current ? { ...current, emailReports: { on: true, ...(current.emailReports?.lastSentMonth ? { lastSentMonth: current.emailReports.lastSentMonth } : {}) }, updatedAt: now() } : null));
    },

    // ─── Programmes ─────────────────────────────────────────────────

    async createProgramme(uid: string, input: unknown): Promise<PortalProgramme> {
      const { plan } = await requireActive(uid);
      const limit = PLANS[plan].programmes;
      if ((await store.programmesByOwner(uid)).length >= limit) {
        throw new OrgError("limit", `Your plan covers ${limit} programme code${limit === 1 ? "" : "s"}. Delete one you no longer use, or move to a larger plan.`);
      }
      const check = checkProgrammeContent(input);
      if (!check.content) throw new OrgError("invalid", check.errors[0] ?? "Check the form.", check.errors);
      refuseWhatThePlanLacks(check.content, plan);

      const at = now();
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = newCode();
        // A code is unique across the in-code register and this database, so a lookup has one answer.
        if (PROGRAMMES.some((entry) => entry.code === code)) continue;
        const record: OrgProgrammeRecord = { code, ownerUid: uid, createdAt: at, updatedAt: at, content: null, draft: check.content, reviewState: "pending", features: { ...NO_FEATURES } };
        if (await store.createProgramme(record)) return portalProgramme(record);
      }
      throw new OrgError("unavailable", "A new code could not be made just now. Please try again.");
    },

    /** Save new words as a draft. Until the owner approves them, people keep seeing the last approved version. */
    async updateProgramme(uid: string, code: string, input: unknown): Promise<PortalProgramme> {
      const { plan } = await requireActive(uid);
      const check = checkProgrammeContent(input);
      if (!check.content) throw new OrgError("invalid", check.errors[0] ?? "Check the form.", check.errors);
      refuseWhatThePlanLacks(check.content, plan);
      const content = check.content;
      await ownProgramme(uid, code);
      const saved = await store.updateProgramme(code, (current) => {
        if (!current || current.ownerUid !== uid) return null;
        // Saving what is already live changes nothing and needs no review.
        if (sameContent(current.content, content) && current.reviewState === "approved") return null;
        const next: OrgProgrammeRecord = { ...current, draft: content, reviewState: sameContent(current.content, content) && !current.draftLogo ? "approved" : "pending", updatedAt: now() };
        delete next.reviewNote;
        delete next.reviewedAt;
        return next;
      });
      if (!saved || saved.ownerUid !== uid) throw new OrgError("not_found", "That programme was not found.");
      return portalProgramme(saved);
    },

    async deleteProgramme(uid: string, code: string): Promise<void> {
      await ownProgramme(uid, code);
      await store.deleteProgramme(code);
    },

    /**
     * Switch the anonymous counts and the workspace on or off for one programme. Returns the report link's secret
     * only at the moment it is made (turning the report on); it cannot be read back afterwards.
     */
    async setFeatures(uid: string, code: string, input: Partial<Record<(typeof FEATURE_KEYS)[number], unknown>>): Promise<{ programme: PortalProgramme; reportKey?: string }> {
      const { org, plan } = await requireActive(uid);
      await ownProgramme(uid, code);
      let reportKey: string | undefined;
      const saved = await store.updateProgramme(code, (current) => {
        if (!current || current.ownerUid !== uid) return null;
        const next: ProgrammeFeatures = { ...current.features };
        for (const key of FEATURE_KEYS) if (typeof input[key] === "boolean") next[key] = input[key] as boolean;
        if (!next.headcount) {
          next.figures = false;
          next.challenge = false;
          next.workspace = false;
          next.pulse = false;
        }
        if (next.headcount && !planAllows(plan, "reports")) throw new OrgError("invalid", "Your plan does not include the monthly report.");
        if (next.figures && !planAllows(plan, "figures")) throw new OrgError("invalid", "Your plan does not include the progress averages.");
        if (next.challenge && !planAllows(plan, "challenge")) throw new OrgError("invalid", "Your plan does not include the dry-month challenge.");
        if (next.pulse && !planAllows(plan, "pulse")) throw new OrgError("invalid", "Your plan does not include the monthly one-question survey.");
        if (next.workspace && !current.features.workspace) {
          const refusal = workspaceRefusal(org, plan);
          if (refusal) throw refusal;
        }

        const record: OrgProgrammeRecord = { ...current, features: next, updatedAt: now() };
        if (next.headcount && !current.reportKeyHash) {
          reportKey = newKey();
          record.reportKeyHash = hashReportKey(reportKey);
        }
        if (!next.headcount) delete record.reportKeyHash;
        return record;
      });
      if (!saved || saved.ownerUid !== uid) throw new OrgError("not_found", "That programme was not found.");
      return { programme: portalProgramme(saved), ...(reportKey ? { reportKey } : {}) };
    },

    /**
     * Send a logo. It is checked (a real small PNG or JPEG, read from its own bytes) and kept as a draft: people are shown the last
     * approved logo until the owner approves this one.
     */
    async setLogo(uid: string, code: string, input: unknown): Promise<PortalProgramme> {
      const { plan } = await requireActive(uid);
      if (!planAllows(plan, "logo")) throw new OrgError("invalid", "Your plan does not include a logo.");
      const checked = checkLogo(input);
      if (!checked.logo) throw new OrgError("invalid", checked.error);
      const logo = checked.logo;
      await ownProgramme(uid, code);
      const saved = await store.updateProgramme(code, (current) => {
        if (!current || current.ownerUid !== uid) return null;
        // Sending the logo that is already live changes nothing.
        if (current.logo?.data === logo.data && !current.draftLogo) return null;
        return { ...current, draftLogo: logo, reviewState: "pending", updatedAt: now() };
      });
      if (!saved || saved.ownerUid !== uid) throw new OrgError("not_found", "That programme was not found.");
      return portalProgramme(saved);
    },

    /** Take the logo away, live and draft. Always allowed: removing a picture needs no review. */
    async removeLogo(uid: string, code: string): Promise<PortalProgramme> {
      await ownProgramme(uid, code);
      const saved = await store.updateProgramme(code, (current) => {
        if (!current || current.ownerUid !== uid) return null;
        const next: OrgProgrammeRecord = { ...current, updatedAt: now() };
        delete next.logo;
        delete next.draftLogo;
        // Waiting for review only because of the picture: nothing is waiting any more.
        if (current.reviewState === "pending" && sameContent(current.content, current.draft)) next.reviewState = "approved";
        return next;
      });
      if (!saved || saved.ownerUid !== uid) throw new OrgError("not_found", "That programme was not found.");
      return portalProgramme(saved);
    },

    /** The organisation's own look at its logo: the one waiting for review if there is one, the live one otherwise (or the one asked for). */
    async readLogo(uid: string, code: string, which: "live" | "draft" | "latest" = "latest"): Promise<StoredLogo | null> {
      const record = await ownProgramme(uid, code);
      if (which === "live") return record.logo ?? null;
      if (which === "draft") return record.draftLogo ?? null;
      return record.draftLogo ?? record.logo ?? null;
    },

    /** The owner's look at a logo before approving it. */
    async ownerReadLogo(code: string, which: "live" | "draft"): Promise<StoredLogo | null> {
      const record = await store.getProgramme(code);
      if (!record) return null;
      return (which === "draft" ? record.draftLogo : record.logo) ?? null;
    },

    /** A new private report link, replacing the old one (which stops working). Shown once. */
    async rotateReportKey(uid: string, code: string): Promise<{ reportKey: string }> {
      await requireActive(uid);
      await ownProgramme(uid, code);
      const reportKey = newKey();
      const saved = await store.updateProgramme(code, (current) => {
        if (!current || current.ownerUid !== uid) return null;
        if (!current.features.headcount) throw new OrgError("invalid", "Turn the monthly report on first.");
        return { ...current, reportKeyHash: hashReportKey(reportKey), updatedAt: now() };
      });
      if (!saved || saved.ownerUid !== uid || saved.reportKeyHash !== hashReportKey(reportKey)) throw new OrgError("not_found", "That programme was not found.");
      return { reportKey };
    },

    /**
     * Give a programme its team's public key, once the team has made it on its own workspace page. Only the owner,
     * signed in, can do this: the report link alone cannot, so someone who got hold of that link cannot swap in
     * a key of their own and read what people send.
     */
    async setWorkspaceKey(uid: string, code: string, key: unknown): Promise<{ keyId: string }> {
      const { org, plan } = await requireActive(uid);
      const refusal = workspaceRefusal(org, plan);
      if (refusal) throw refusal;
      await ownProgramme(uid, code);
      const clean = cleanPublicKey(key);
      if (!clean) throw new OrgError("invalid", "That is not a valid public key. Paste exactly the block your team's workspace page gives you. A key that contains a private part is refused.");
      const saved = await store.updateProgramme(code, (current) => {
        if (!current || current.ownerUid !== uid) return null;
        if (!current.features.workspace) throw new OrgError("invalid", "Turn the team workspace on for this programme first.");
        return { ...current, workspacePublicKey: clean, updatedAt: now() };
      });
      if (!saved || saved.ownerUid !== uid) throw new OrgError("not_found", "That programme was not found.");
      return { keyId: workspaceKeyId(clean) };
    },

    /** The private roll-up link across all of this organisation's programmes (plans that include it). Shown once; replaces any earlier one. */
    async rollupKey(uid: string): Promise<{ rollupKey: string }> {
      const { plan } = await requireActive(uid);
      if (!planAllows(plan, "rollup")) throw new OrgError("invalid", "Your plan does not include a roll-up across programmes.");
      const rollupKey = newKey();
      await store.updateOrg(uid, (org) => (org ? { ...org, rollupKeyHash: hashReportKey(rollupKey), updatedAt: now() } : null));
      return { rollupKey };
    },

    // ─── The owner ──────────────────────────────────────────────────

    async ownerOverview(): Promise<{ orgs: OwnerOrgRow[]; pending: ProgrammeSummary[]; rejected: ProgrammeSummary[] }> {
      const at = now();
      const orgs = await store.listOrgs(200);
      const byId = new Map(orgs.map((org) => [org.id, org]));
      const summarise = async (record: OrgProgrammeRecord): Promise<ProgrammeSummary> => {
        const org = byId.get(record.ownerUid) ?? (await store.getOrg(record.ownerUid));
        return { code: record.code, ownerUid: record.ownerUid, orgName: org?.name ?? "(unknown)", orgKind: org?.kind ?? "workplace", kindVerified: org?.kindVerified ?? false, draft: record.draft, live: record.content, reviewState: record.reviewState, ...(record.reviewNote ? { reviewNote: record.reviewNote } : {}), logoLive: Boolean(record.logo), logoDraft: Boolean(record.draftLogo), updatedAt: record.updatedAt };
      };
      const pending = await Promise.all((await store.programmesByReview("pending", 100)).map(summarise));
      const rejected = await Promise.all((await store.programmesByReview("rejected", 50)).map(summarise));
      return {
        orgs: orgs.map((org) => ({ id: org.id, name: org.name, kind: org.kind, kindVerified: org.kindVerified, contactEmail: org.contactEmail, createdAt: org.createdAt, access: accessSummary(org.subscription, at), subscription: org.subscription, purchases: org.purchases })),
        pending,
        rejected
      };
    },

    /** Approve (the draft becomes what people see), reject (people keep what they had), or unpublish (people see nothing). */
    async reviewProgramme(code: string, decision: "approve" | "reject" | "unpublish", note?: unknown): Promise<void> {
      const text = cleanText(note, ORG_LIMITS.noteMax);
      if (decision === "reject" && !text) throw new OrgError("invalid", "Say why, in a sentence, so the organisation can fix it.");
      const saved = await store.updateProgramme(code, (current) => {
        if (!current) return null;
        const next: OrgProgrammeRecord = { ...current, reviewedAt: now(), updatedAt: current.updatedAt };
        if (decision === "approve") {
          next.content = current.draft;
          if (current.draftLogo) next.logo = current.draftLogo;
          delete next.draftLogo;
          next.reviewState = "approved";
          delete next.reviewNote;
        } else if (decision === "reject") {
          next.reviewState = "rejected";
          next.reviewNote = text;
        } else {
          next.content = null;
          delete next.logo;
          delete next.draftLogo;
          next.reviewState = "rejected";
          next.reviewNote = text || "This programme was taken down. Contact us.";
        }
        return next;
      });
      if (!saved) throw new OrgError("not_found", "That programme was not found.");
    },

    async setKindVerified(uid: string, verified: boolean): Promise<void> {
      const saved = await store.updateOrg(uid, (org) => (org ? { ...org, kindVerified: verified, updatedAt: now() } : null));
      if (!saved) throw new OrgError("not_found", "That organisation was not found.");
    },

    /** Switch a plan on by hand after an invoice or a bank transfer has been paid. Until the date given; it ends by itself. */
    async activateManual(uid: string, input: { plan?: unknown; endsAt?: unknown; note?: unknown }): Promise<void> {
      const at = now();
      if (!isPlanId(input.plan)) throw new OrgError("invalid", "Choose a plan.");
      const end = typeof input.endsAt === "number" ? input.endsAt : Date.parse(String(input.endsAt));
      if (!Number.isFinite(end) || end <= at) throw new OrgError("invalid", "Choose an end date in the future.");
      if (end > at + 400 * 24 * 60 * 60 * 1000) throw new OrgError("invalid", "A manual activation can run for at most 400 days. Renew it when it ends.");
      const plan = input.plan;
      const note = cleanText(input.note, ORG_LIMITS.noteMax);
      const saved = await store.updateOrg(uid, (org) => {
        if (!org) return null;
        if (!planFitsKind(plan, org.kind)) throw new OrgError("invalid", `The ${PLANS[plan].name} plan is not for this kind of organisation.`);
        if (org.subscription?.source === "stripe" && hasAccess(org.subscription, at)) throw new OrgError("conflict", "This organisation has an active card subscription. Cancel that in Stripe first, or leave it as it is.");
        const subscription: Subscription = { source: "manual", plan, status: "active", currentPeriodEnd: end, cancelAtPeriodEnd: false, updatedAt: at, ...(note ? { note } : {}) };
        return { ...org, subscription, updatedAt: at };
      });
      if (!saved) throw new OrgError("not_found", "That organisation was not found.");
    },

    async deactivateManual(uid: string): Promise<void> {
      const at = now();
      const saved = await store.updateOrg(uid, (org) => {
        if (!org) return null;
        if (org.subscription?.source === "stripe") throw new OrgError("conflict", "This is a card subscription. Cancel it in Stripe.");
        if (!org.subscription) return null;
        return { ...org, subscription: { ...org.subscription, status: "canceled", updatedAt: at }, updatedAt: at };
      });
      if (!saved) throw new OrgError("not_found", "That organisation was not found.");
    }
  };
}

export type OrgService = ReturnType<typeof createOrgService>;
