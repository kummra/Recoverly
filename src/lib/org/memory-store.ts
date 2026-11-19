/** An in-memory `OrgStore`, for tests. Stores copies, so a test cannot change a "stored" record by mutating what it was handed. */
import type { OrgProgrammeRecord, OrgRecord } from "@/lib/org/model";
import type { OrgStore } from "@/lib/org/store";

const copy = <T>(value: T): T => structuredClone(value);

export function memoryOrgStore(): OrgStore & { orgs: Map<string, OrgRecord>; programmes: Map<string, OrgProgrammeRecord>; events: Map<string, { created: number; type: string }> } {
  const orgs = new Map<string, OrgRecord>();
  const programmes = new Map<string, OrgProgrammeRecord>();
  const events = new Map<string, { created: number; type: string }>();
  const first = <T>(items: T[]): T | null => (items[0] ? copy(items[0]) : null);

  return {
    orgs,
    programmes,
    events,
    async getOrg(id) {
      const found = orgs.get(id);
      return found ? copy(found) : null;
    },
    async createOrg(org) {
      if (orgs.has(org.id)) return false;
      orgs.set(org.id, copy(org));
      return true;
    },
    async updateOrg(id, change) {
      const current = orgs.get(id);
      const next = change(current ? copy(current) : null);
      if (!next) return current ? copy(current) : null;
      orgs.set(id, copy(next));
      return copy(next);
    },
    async orgByCustomerId(customerId) {
      return first([...orgs.values()].filter((org) => org.subscription?.customerId === customerId));
    },
    async orgByRollupHash(hash) {
      return first([...orgs.values()].filter((org) => org.rollupKeyHash === hash));
    },
    async listOrgs(limit) {
      return [...orgs.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit).map(copy);
    },
    async getProgramme(code) {
      const found = programmes.get(code);
      return found ? copy(found) : null;
    },
    async createProgramme(record) {
      if (programmes.has(record.code)) return false;
      programmes.set(record.code, copy(record));
      return true;
    },
    async updateProgramme(code, change) {
      const current = programmes.get(code);
      const next = change(current ? copy(current) : null);
      if (!next) return current ? copy(current) : null;
      programmes.set(code, copy(next));
      return copy(next);
    },
    async deleteProgramme(code) {
      programmes.delete(code);
    },
    async programmesByOwner(uid) {
      return [...programmes.values()].filter((p) => p.ownerUid === uid).map(copy);
    },
    async programmeByReportHash(hash) {
      return first([...programmes.values()].filter((p) => p.reportKeyHash === hash));
    },
    async programmesByReview(state, limit) {
      return [...programmes.values()].filter((p) => p.reviewState === state).slice(0, limit).map(copy);
    },
    async eventSeen(id) {
      return events.has(id);
    },
    async markEvent(id, created, type) {
      events.set(id, { created, type });
    }
  };
}
