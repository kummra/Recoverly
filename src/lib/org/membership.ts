/** Whether a signed-in owner has an organisation with an active plan that is meant for its kind. The one check every members' feature shares. */
import type { PlanId } from "@/lib/billing/catalogue";
import { planFitsKind } from "@/lib/billing/catalogue";
import { hasAccess } from "@/lib/billing/entitlement";
import type { OrgRecord } from "@/lib/org/model";
import type { OrgStore } from "@/lib/org/store";

export type Membership = { org: OrgRecord; plan: PlanId };

export async function activeMembership(store: OrgStore, uid: string, now: number): Promise<Membership | null> {
  const org = await store.getOrg(uid);
  const subscription = org?.subscription;
  if (!org || !subscription || !hasAccess(subscription, now) || !planFitsKind(subscription.plan, org.kind)) return null;
  return { org, plan: subscription.plan };
}
