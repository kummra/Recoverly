/**
 * What an organisation can buy and what each plan includes. No prices live here: an amount is set in the
 * payment provider and shown from there, so a price can change without a deploy and the code never states one
 * the owner has not set. Individuals never pay for anything: every plan here is for an organisation.
 */
import type { ProgrammeKind } from "@/lib/programme";

export type OrgKind = Exclude<ProgrammeKind, "sample">;
export const ORG_KINDS: readonly OrgKind[] = ["workplace", "college", "clinic", "community"];
export const isOrgKind = (value: unknown): value is OrgKind => typeof value === "string" && (ORG_KINDS as readonly string[]).includes(value);

export const KIND_LABELS: Record<OrgKind, string> = {
  workplace: "Employer or fleet",
  college: "College or university",
  clinic: "Clinic or de-addiction centre",
  community: "NGO, community or government programme"
};

export const FEATURES = ["reports", "figures", "challenge", "workspace", "toolkit", "csv", "rollup", "logo", "referrals", "emailReports"] as const;
export type Feature = (typeof FEATURES)[number];

export const FEATURE_LABELS: Record<Feature, string> = {
  reports: "Private monthly report (anonymous headcount)",
  figures: "Anonymous progress averages",
  challenge: "Dry-month challenge count",
  workspace: "Private team workspace (clinics and community services only)",
  toolkit: "Full toolkit: posters with your own code, session outline, manager guide, campaign kit, orientation pack, clinic handout",
  csv: "Report download as CSV",
  rollup: "Roll-up report across many programmes",
  logo: "Your logo on your join page and dashboard card",
  referrals: "A list of local referrals shown to your people",
  emailReports: "Monthly report by email"
};

export const PLAN_IDS = ["clinic", "workplace", "network"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export const isPlanId = (value: unknown): value is PlanId => typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);

export type Plan = {
  id: PlanId;
  name: string;
  audience: string;
  kinds: readonly OrgKind[];
  /** How many programme codes (sites, depots, campuses, districts) the plan covers. */
  programmes: number;
  features: readonly Feature[];
  /** The environment variable that holds this plan's price id in the payment provider. */
  priceEnv: string;
};

const COMMON: readonly Feature[] = ["reports", "figures", "challenge", "toolkit", "csv", "logo", "referrals", "emailReports"];

export const PLANS: Readonly<Record<PlanId, Plan>> = {
  clinic: {
    id: "clinic",
    name: "Clinic and counselling",
    audience: "Clinics, hospitals, de-addiction centres and community counselling services",
    kinds: ["clinic", "community"],
    programmes: 3,
    features: [...COMMON, "workspace"],
    priceEnv: "STRIPE_PRICE_CLINIC"
  },
  workplace: {
    id: "workplace",
    name: "Employer, fleet or college",
    audience: "Employers, transport fleets, colleges and universities",
    kinds: ["workplace", "college"],
    programmes: 5,
    features: COMMON,
    priceEnv: "STRIPE_PRICE_WORKPLACE"
  },
  network: {
    id: "network",
    name: "Network, NGO or programme",
    audience: "NGOs, CSR and government programmes and regional partners running many sites",
    kinds: ORG_KINDS,
    programmes: 50,
    features: [...COMMON, "rollup", "workspace"],
    priceEnv: "STRIPE_PRICE_NETWORK"
  }
};

export const plansForKind = (kind: OrgKind): Plan[] => PLAN_IDS.map((id) => PLANS[id]).filter((plan) => plan.kinds.includes(kind));
/** Whether a plan is meant for this kind of organisation. A plan that does not fit grants nothing, however it came to be on the account. */
export const planFitsKind = (plan: PlanId, kind: OrgKind): boolean => PLANS[plan].kinds.includes(kind);
export const planAllows = (plan: PlanId | null | undefined, feature: Feature): boolean => Boolean(plan && PLANS[plan].features.includes(feature));

/** One-off services. Bought by an organisation that has an account; not a plan and not access to the app. */
export const PRODUCTS = [
  {
    id: "workshop",
    name: "Launch workshop",
    description: "A facilitated launch session for your people, run with you, using the toolkit.",
    priceEnv: "STRIPE_PRICE_WORKSHOP"
  }
] as const;
export type ProductId = (typeof PRODUCTS)[number]["id"];

/** A price id from the environment, only if it looks like one. `null` means online payment is not set up for it. */
export function priceIdFromEnv(name: string, env: Record<string, string | undefined> = process.env): string | null {
  const value = env[name]?.trim();
  return value && /^price_[A-Za-z0-9]+$/.test(value) ? value : null;
}
