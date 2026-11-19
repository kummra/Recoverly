/**
 * Where organisations and their programmes are kept. An interface, so the rules in `service.ts` and
 * `directory.ts` are tested against an in-memory copy and run for real against Firestore (`firestore.ts`).
 *
 * Read-modify-write goes through `updateOrg` and `updateProgramme`, which run atomically (a Firestore
 * transaction), so two webhooks or two clicks at once cannot overwrite each other's change.
 */
import type { OrgProgrammeRecord, OrgRecord, ReviewState } from "@/lib/org/model";

export type OrgStore = {
  getOrg(id: string): Promise<OrgRecord | null>;
  /** Create only if there is none. `false` if one already exists. */
  createOrg(org: OrgRecord): Promise<boolean>;
  /** Change an organisation atomically. `change` gets the current record (or `null`) and returns the new one, or `null` to leave it as it is. */
  updateOrg(id: string, change: (current: OrgRecord | null) => OrgRecord | null): Promise<OrgRecord | null>;
  orgByCustomerId(customerId: string): Promise<OrgRecord | null>;
  orgByRollupHash(hash: string): Promise<OrgRecord | null>;
  listOrgs(limit: number): Promise<OrgRecord[]>;

  getProgramme(code: string): Promise<OrgProgrammeRecord | null>;
  createProgramme(record: OrgProgrammeRecord): Promise<boolean>;
  updateProgramme(code: string, change: (current: OrgProgrammeRecord | null) => OrgProgrammeRecord | null): Promise<OrgProgrammeRecord | null>;
  deleteProgramme(code: string): Promise<void>;
  programmesByOwner(uid: string): Promise<OrgProgrammeRecord[]>;
  programmeByReportHash(hash: string): Promise<OrgProgrammeRecord | null>;
  programmesByReview(state: ReviewState, limit: number): Promise<OrgProgrammeRecord[]>;

  /** Whether a payment-provider event has already been handled (so a retry changes nothing). */
  eventSeen(id: string): Promise<boolean>;
  markEvent(id: string, created: number, type: string): Promise<void>;
};
