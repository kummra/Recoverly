/**
 * What the organisation portal stores and shows. Plain types and parsers, safe for browsers and the server:
 * nothing here reads a secret or the register.
 *
 * Two records, both in server-only Firestore collections (the default-deny rules give a browser no access):
 *
 *  - `organisations/{ownerUid}`: who the organisation is, its kind, and its subscription. One per sign-in.
 *  - `orgProgrammes/{CODE}`: one programme (a site, depot, campus or district) with the words its people see.
 *    What an organisation writes is a **draft** until the owner approves it; only approved words are ever
 *    served to people (`content`). That review is the guard against a self-serve organisation putting a
 *    stranger's number in front of someone looking for help (firm rule 2). Anonymous counts and the team
 *    workspace are switched on per programme (`features`) and only ever within what the plan and the kind allow.
 */
import { type OrgKind, type Plan, isOrgKind, isPlanId } from "@/lib/billing/catalogue";
import { type AccessSummary, type Subscription, normaliseStatus } from "@/lib/billing/entitlement";
import { type StoredLogo, parseLogo } from "@/lib/org/logo-model";
import { type ProgrammeContent, normaliseCode, sanitiseProgrammeContent } from "@/lib/programme";

/** The version of the organisation terms a person accepted. Bump it when the terms change materially. */
export const ORG_TERMS_VERSION = "2026-11";

export const ORG_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 120,
  noteMax: 300,
  purchasesMax: 30
} as const;

export type ReviewState = "pending" | "approved" | "rejected";
export const REVIEW_STATES: readonly ReviewState[] = ["pending", "approved", "rejected"];

export type ProgrammeFeatures = { headcount: boolean; figures: boolean; challenge: boolean; workspace: boolean; pulse: boolean };
export const NO_FEATURES: Readonly<ProgrammeFeatures> = { headcount: false, figures: false, challenge: false, workspace: false, pulse: false };

export type Purchase = { item: string; at: number; ref: string };

export type OrgRecord = {
  /** The owner's Firebase uid. */
  id: string;
  name: string;
  kind: OrgKind;
  /** Where receipts and (later) reports go: the owner's sign-in address, kept only if the account had verified it. */
  contactEmail: string | null;
  /** The owner has confirmed this really is the kind it says (needed before the team workspace, which hands over individual-level data). */
  kindVerified: boolean;
  createdAt: number;
  updatedAt: number;
  termsAcceptedAt: number;
  termsVersion: string;
  subscription: Subscription | null;
  purchases: Purchase[];
  /** SHA-256 of the private roll-up link, for a plan that has one. */
  rollupKeyHash?: string;
  /** The monthly report by email: switched on by the owner of the organisation, and the last month it was sent for (so it is sent once). */
  emailReports?: { on: boolean; lastSentMonth?: string };
};

export type OrgProgrammeRecord = {
  code: string;
  ownerUid: string;
  createdAt: number;
  updatedAt: number;
  /** What people are shown: the last version the owner approved. `null` until the first approval. */
  content: ProgrammeContent | null;
  /** What the organisation last submitted. */
  draft: ProgrammeContent;
  reviewState: ReviewState;
  reviewNote?: string;
  reviewedAt?: number;
  features: ProgrammeFeatures;
  /** SHA-256 of the private report link; present only while the monthly report is on. */
  reportKeyHash?: string;
  /** The team's public key (never a private part), once the organisation has sent it. */
  workspacePublicKey?: JsonWebKey;
  /** The logo people are shown: the last one the owner approved. */
  logo?: StoredLogo;
  /** A logo the organisation has sent that is waiting for the owner. */
  draftLogo?: StoredLogo;
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown, fallback = 0): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const str = (value: unknown, max: number): string => (typeof value === "string" ? value.slice(0, max) : "");

export function parseSubscription(value: unknown): Subscription | null {
  if (!isObject(value) || !isPlanId(value.plan)) return null;
  const source = value.source === "manual" ? "manual" : value.source === "stripe" ? "stripe" : null;
  if (!source) return null;
  const subscription: Subscription = {
    source,
    plan: value.plan,
    status: normaliseStatus(value.status),
    currentPeriodEnd: typeof value.currentPeriodEnd === "number" && Number.isFinite(value.currentPeriodEnd) ? value.currentPeriodEnd : null,
    cancelAtPeriodEnd: value.cancelAtPeriodEnd === true,
    updatedAt: num(value.updatedAt)
  };
  if (typeof value.customerId === "string" && value.customerId) subscription.customerId = value.customerId.slice(0, 80);
  if (typeof value.subscriptionId === "string" && value.subscriptionId) subscription.subscriptionId = value.subscriptionId.slice(0, 80);
  if (typeof value.eventCreated === "number" && Number.isFinite(value.eventCreated)) subscription.eventCreated = value.eventCreated;
  if (typeof value.note === "string" && value.note) subscription.note = value.note.slice(0, ORG_LIMITS.noteMax);
  return subscription;
}

export function parseOrg(id: string, data: Record<string, unknown> | undefined): OrgRecord | null {
  if (!data || !id) return null;
  const name = str(data.name, ORG_LIMITS.nameMax);
  if (!name || !isOrgKind(data.kind)) return null;
  const purchases = (Array.isArray(data.purchases) ? data.purchases : [])
    .filter(isObject)
    .map((p) => ({ item: str(p.item, 40), at: num(p.at), ref: str(p.ref, 80) }))
    .filter((p) => p.item && p.ref)
    .slice(-ORG_LIMITS.purchasesMax);
  const org: OrgRecord = {
    id,
    name,
    kind: data.kind,
    contactEmail: typeof data.contactEmail === "string" && data.contactEmail ? data.contactEmail.slice(0, ORG_LIMITS.emailMax) : null,
    kindVerified: data.kindVerified === true,
    createdAt: num(data.createdAt),
    updatedAt: num(data.updatedAt),
    termsAcceptedAt: num(data.termsAcceptedAt),
    termsVersion: str(data.termsVersion, 20),
    subscription: parseSubscription(data.subscription),
    purchases
  };
  if (typeof data.rollupKeyHash === "string" && /^[0-9a-f]{64}$/.test(data.rollupKeyHash)) org.rollupKeyHash = data.rollupKeyHash;
  if (isObject(data.emailReports) && data.emailReports.on === true) {
    org.emailReports = { on: true };
    if (typeof data.emailReports.lastSentMonth === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(data.emailReports.lastSentMonth)) org.emailReports.lastSentMonth = data.emailReports.lastSentMonth;
  }
  return org;
}

export function parseFeatures(value: unknown): ProgrammeFeatures {
  const raw = isObject(value) ? value : {};
  const headcount = raw.headcount === true;
  // Everything else hangs off the monthly report: without it there is nothing to show them in.
  return { headcount, figures: headcount && raw.figures === true, challenge: headcount && raw.challenge === true, workspace: headcount && raw.workspace === true, pulse: headcount && raw.pulse === true };
}

export function parseProgramme(code: string, data: Record<string, unknown> | undefined): OrgProgrammeRecord | null {
  if (!data) return null;
  const normal = normaliseCode(code);
  if (!normal || normal !== code || typeof data.ownerUid !== "string" || !data.ownerUid) return null;
  const draft = sanitiseProgrammeContent(data.draft);
  if (!draft) return null;
  const content = data.content === null || data.content === undefined ? null : sanitiseProgrammeContent(data.content);
  const reviewState = (REVIEW_STATES as readonly unknown[]).includes(data.reviewState) ? (data.reviewState as ReviewState) : "pending";
  const record: OrgProgrammeRecord = {
    code,
    ownerUid: data.ownerUid,
    createdAt: num(data.createdAt),
    updatedAt: num(data.updatedAt),
    content,
    draft,
    reviewState,
    features: parseFeatures(data.features)
  };
  if (typeof data.reviewNote === "string" && data.reviewNote) record.reviewNote = data.reviewNote.slice(0, ORG_LIMITS.noteMax);
  if (typeof data.reviewedAt === "number") record.reviewedAt = data.reviewedAt;
  if (typeof data.reportKeyHash === "string" && /^[0-9a-f]{64}$/.test(data.reportKeyHash)) record.reportKeyHash = data.reportKeyHash;
  if (isObject(data.workspacePublicKey)) record.workspacePublicKey = data.workspacePublicKey as JsonWebKey;
  const logo = parseLogo(data.logo);
  const draftLogo = parseLogo(data.draftLogo);
  if (logo) record.logo = logo;
  if (draftLogo) record.draftLogo = draftLogo;
  // A report switched off has no key; a report switched on always has one.
  if (!record.features.headcount) delete record.reportKeyHash;
  else if (!record.reportKeyHash) record.features = { ...NO_FEATURES };
  return record;
}

/** A programme as the portal shows it to its owner: never a key hash, never a key. */
export type PortalProgramme = {
  code: string;
  draft: ProgrammeContent;
  live: ProgrammeContent | null;
  reviewState: ReviewState;
  reviewNote?: string;
  features: ProgrammeFeatures;
  reportLinkOn: boolean;
  workspaceKeyId: string | null;
  /** Whether there is a logo people see (`live`) and one waiting for review (`draft`). The pictures themselves are fetched separately. */
  logo: { live: boolean; draft: boolean };
  createdAt: number;
  updatedAt: number;
};

export type PortalOrg = Pick<OrgRecord, "name" | "kind" | "contactEmail" | "kindVerified" | "createdAt" | "termsVersion" | "purchases"> & { rollupOn: boolean; emailReports: boolean };

export type PlanOffer = Pick<Plan, "id" | "name" | "audience" | "programmes" | "features">;

/** Everything the portal shows its owner. Built on the server and sent as JSON; contains no key and no hash. */
export type PortalOverview = {
  org: PortalOrg;
  access: AccessSummary;
  programmes: PortalProgramme[];
  /** How many programme codes the current plan covers, or `null` with no plan. */
  programmeLimit: number | null;
  plans: PlanOffer[];
  /** Whether this organisation could use the team workspace at all (a clinic or community kind on a plan that has it). */
  workspaceEligible: boolean;
};

/** What the owner sees of a programme waiting for review. */
export type ProgrammeSummary = {
  code: string;
  ownerUid: string;
  orgName: string;
  orgKind: OrgRecord["kind"];
  kindVerified: boolean;
  draft: ProgrammeContent;
  live: ProgrammeContent | null;
  reviewState: OrgProgrammeRecord["reviewState"];
  reviewNote?: string;
  logoLive: boolean;
  logoDraft: boolean;
  updatedAt: number;
};

export type OwnerOrgRow = {
  id: string;
  name: string;
  kind: OrgRecord["kind"];
  kindVerified: boolean;
  contactEmail: string | null;
  createdAt: number;
  access: AccessSummary;
  subscription: Subscription | null;
  purchases: OrgRecord["purchases"];
};
