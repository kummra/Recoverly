/**
 * Where a programme code, a private report link or a team link is looked up. Two sources, in this order:
 *
 *  1. the in-code register (`programme-register.ts`): the owner's pilots and the sample. They are free, are
 *     reviewed as code, and are never charged for;
 *  2. the organisation database: programmes that paying organisations made themselves in the portal.
 *
 * A database programme is served only while all of these hold, and each is checked on every request:
 *   - its organisation has an active plan (`hasAccess`) and the plan is meant for that kind of organisation;
 *   - the owner has approved its words (people never see a draft);
 *   - each anonymous count is on **and** in the plan; the team workspace is also a clinic or community kind
 *     the owner has confirmed, and has a public key.
 * When any of that stops holding (a lapsed plan, a taken-down programme) the code simply stops being found.
 * People who already joined keep what is on their own device; nothing else about them was ever held.
 *
 * A database programme is turned into a register entry and then goes through exactly the same helpers as an
 * in-code one (`publicProgramme`, `workspaceTeamFor`), so the two cannot drift apart in what they show.
 *
 * Server only (it hashes report links with the register's own function).
 */
import { planAllows, planFitsKind } from "@/lib/billing/catalogue";
import { hasAccess } from "@/lib/billing/entitlement";
import type { StoredLogo } from "@/lib/org/logo-model";
import type { OrgProgrammeRecord, OrgRecord } from "@/lib/org/model";
import type { OrgStore } from "@/lib/org/store";
import { type Programme, normaliseCode } from "@/lib/programme";
import {
  type RegisterEntry,
  type RegisterGroup,
  findGroupByKey as registerFindGroupByKey,
  findProgramme as registerFindProgramme,
  findProgrammeByReportKey as registerFindProgrammeByReportKey,
  findWorkspaceByReportKey as registerFindWorkspaceByReportKey,
  findWorkspaceTeam as registerFindWorkspaceTeam,
  hashReportKey,
  publicProgramme,
  workspaceTeamFor
} from "@/lib/programme-register";
import { type WorkspaceTeam, workspaceAllowedFor } from "@/lib/workspace";

const validKey = (token: unknown): token is string => typeof token === "string" && token.length >= 20 && token.length <= 100;

export type DirectoryDeps = { store: OrgStore | null; now?: () => number };

export function createDirectory(deps: DirectoryDeps) {
  const { store } = deps;
  const now = deps.now ?? Date.now;

  /**
   * A database programme as a register entry, or `null` if it must not be served now. `people` is what a person
   * who types the code is shown, and uses only approved words. `team` is for the organisation's own private pages
   * (report, workspace, roll-up), which need only a name and so may use the draft one before the first approval.
   */
  function entryFor(record: OrgProgrammeRecord, org: OrgRecord, audience: "people" | "team"): RegisterEntry | null {
    const content = audience === "people" ? record.content : (record.content ?? record.draft);
    const subscription = org.subscription;
    if (!content || !subscription || !hasAccess(subscription, now()) || !planFitsKind(subscription.plan, org.kind)) return null;
    const plan = subscription.plan;

    const entry: RegisterEntry = { code: record.code, name: content.name, kind: org.kind, welcome: content.welcome, contacts: content.contacts };
    if (content.locale) entry.locale = content.locale;
    if (content.plans) entry.plans = content.plans;
    if (content.questions) entry.questions = content.questions;
    if (content.referrals && planAllows(plan, "referrals")) entry.referrals = content.referrals;
    if (audience === "people" && record.logo && planAllows(plan, "logo")) entry.logo = true;

    if (record.features.headcount && record.reportKeyHash && planAllows(plan, "reports")) {
      entry.report = { keyHash: record.reportKeyHash };
      if (record.features.figures && planAllows(plan, "figures")) entry.figures = true;
      if (record.features.challenge && planAllows(plan, "challenge")) entry.challenge = true;
      if (record.features.pulse && planAllows(plan, "pulse")) entry.pulse = true;
      if (record.features.workspace && planAllows(plan, "workspace") && org.kindVerified && workspaceAllowedFor(org.kind)) {
        entry.workspace = record.workspacePublicKey ? { publicKey: record.workspacePublicKey } : {};
      }
    }
    return entry;
  }

  async function liveEntry(code: string, audience: "people" | "team"): Promise<RegisterEntry | null> {
    if (!store) return null;
    const record = await store.getProgramme(code);
    if (!record) return null;
    const org = await store.getOrg(record.ownerUid);
    return org ? entryFor(record, org, audience) : null;
  }

  /** The logo of a programme people are shown, only while the programme itself is served and its plan has logos. */
  async function findLogo(input: unknown): Promise<StoredLogo | null> {
    const code = normaliseCode(input);
    if (!code || !store) return null;
    const record = await store.getProgramme(code);
    if (!record?.logo) return null;
    const org = await store.getOrg(record.ownerUid);
    const entry = org ? entryFor(record, org, "people") : null;
    return entry?.logo ? record.logo : null;
  }

  /** The programme for a code a person typed or scanned, or `null`. */
  async function findProgramme(input: unknown): Promise<Programme | null> {
    const code = normaliseCode(input);
    if (!code) return null;
    const fixed = registerFindProgramme(code);
    if (fixed) return fixed;
    const entry = await liveEntry(code, "people");
    return entry ? publicProgramme(entry) : null;
  }

  /** The workspace a person can share with, for a programme code: the sample (practice), or one whose team key is on file. */
  async function findWorkspaceTeam(input: unknown): Promise<WorkspaceTeam | null> {
    const code = normaliseCode(input);
    if (!code) return null;
    const fixed = registerFindWorkspaceTeam(code);
    if (fixed) return fixed;
    const entry = await liveEntry(code, "people");
    const team = entry ? workspaceTeamFor(entry) : null;
    return team && (team.practice || team.publicKey) ? team : null;
  }

  /** The organisation a private report link belongs to, or `null` (also when its plan has lapsed). */
  async function findProgrammeByReportKey(token: unknown): Promise<RegisterEntry | null> {
    const fixed = registerFindProgrammeByReportKey(token);
    if (fixed) return fixed;
    if (!store || !validKey(token)) return null;
    const record = await store.programmeByReportHash(hashReportKey(token));
    if (!record) return null;
    const org = await store.getOrg(record.ownerUid);
    const entry = org ? entryFor(record, org, "team") : null;
    return entry?.report ? entry : null;
  }

  /** The workspace behind a team's private link; also answers while the team has not yet sent its key, so its page can walk it through. */
  async function findWorkspaceByReportKey(token: unknown): Promise<WorkspaceTeam | null> {
    const fixed = registerFindWorkspaceByReportKey(token);
    if (fixed) return fixed;
    const entry = await findProgrammeByReportKey(token);
    const team = entry ? workspaceTeamFor(entry) : null;
    return team && !team.practice ? team : null;
  }

  /** The roll-up behind a private link, with the programmes it adds up. */
  async function findGroupByKey(token: unknown): Promise<{ group: RegisterGroup; members: RegisterEntry[] } | null> {
    const fixed = registerFindGroupByKey(token);
    if (fixed) return fixed;
    if (!store || !validKey(token)) return null;
    const org = await store.orgByRollupHash(hashReportKey(token));
    const subscription = org?.subscription;
    if (!org || !org.rollupKeyHash || !subscription || !hasAccess(subscription, now()) || !planFitsKind(subscription.plan, org.kind) || !planAllows(subscription.plan, "rollup")) return null;
    const members = (await store.programmesByOwner(org.id)).map((record) => entryFor(record, org, "team")).filter((entry): entry is RegisterEntry => entry !== null && Boolean(entry.report));
    return { group: { name: org.name, keyHash: org.rollupKeyHash }, members };
  }

  /**
   * Whether a private link is a real one whose organisation has no active plan, with the name to show. The
   * organisation's own pages use this to say "your plan has ended" instead of a bare 404.
   */
  async function findLapsedByKey(token: unknown): Promise<{ name: string } | null> {
    if (!store || !validKey(token)) return null;
    const hash = hashReportKey(token);
    const record = await store.programmeByReportHash(hash);
    if (record) {
      const org = await store.getOrg(record.ownerUid);
      return org && !hasAccess(org.subscription, now()) ? { name: record.content?.name ?? record.draft.name } : null;
    }
    const org = await store.orgByRollupHash(hash);
    return org && !hasAccess(org.subscription, now()) ? { name: org.name } : null;
  }

  return { findProgramme, findLogo, findWorkspaceTeam, findProgrammeByReportKey, findWorkspaceByReportKey, findGroupByKey, findLapsedByKey };
}

export type Directory = ReturnType<typeof createDirectory>;
