/**
 * The monthly report by email: on the second of each month, an organisation that switched it on is sent last month's figures, for each
 * programme that has its report on. Only what the report page itself would show: a number rounded to the nearest 5 once 20 or more
 * people were counted, "fewer than 20" below that (`displayCount`). Nothing else about anyone is in it, because nothing else
 * exists. The private report link is not in it either: only its hash is kept, so it cannot be repeated; the email points back to
 * the link the organisation saved.
 *
 * It goes only to the organisation owner's confirmed sign-in address, never to an address typed into a form, so this cannot be used
 * to send something to a stranger. Each organisation is claimed for the month before it is sent (inside a transaction), so a second run,
 * or two at once, cannot send it twice; if sending fails the claim is given back so the next run tries again.
 */
import { planAllows, planFitsKind } from "@/lib/billing/catalogue";
import { hasAccess } from "@/lib/billing/entitlement";
import type { OrgProgrammeRecord, OrgRecord } from "@/lib/org/model";
import type { OrgStore } from "@/lib/org/store";
import { type CountDisplay, displayCount, monthKey, monthLabel, shiftMonth } from "@/lib/programme-count";
import type { CountStore } from "@/lib/programme-count-service";

export type ReportMessage = { to: string; subject: string; text: string };
export type ReportMailer = (message: ReportMessage) => Promise<boolean>;

export type ReportRunSummary = { considered: number; sent: number; skipped: number; failed: number };

const describe = (display: CountDisplay): string => (display.shown ? `about ${display.value} people were counted` : "fewer than 20 people were counted, so no figure is shown");

export function monthlyReportText(orgName: string, month: string, rows: Array<{ programme: string; display: CountDisplay }>, portalUrl: string): string {
  const label = monthLabel(month);
  return [
    `${orgName}: your Recoverly report for ${label}`,
    "",
    ...rows.map((row) => `${row.programme}: ${describe(row.display)}.`),
    "",
    "How to read this: each person chooses to be counted, with a box that stays off until they tick it, so the real number of people using Recoverly is likely higher. A figure is shown only when at least 20 people are counted, and it is rounded to the nearest 5, so that no one can be picked out. We keep no names and cannot tell you who was counted.",
    "",
    "Your programmes' private report pages show the last six months and the other figures you have switched on. Open the private link you saved when you turned the report on. If you have lost it, make a new one in the organisation portal (the old one then stops working).",
    portalUrl,
    "",
    "You get this email because you switched it on in the portal. Switch it off there at any time."
  ].join("\n");
}

const reporting = (record: OrgProgrammeRecord) => record.features.headcount && Boolean(record.reportKeyHash);

export async function sendMonthlyReports(deps: { store: OrgStore; counts: Pick<CountStore, "read">; mail: ReportMailer; now: Date; portalUrl: string }): Promise<ReportRunSummary> {
  const { store, counts, mail, now, portalUrl } = deps;
  const month = shiftMonth(monthKey(now), -1);
  const summary: ReportRunSummary = { considered: 0, sent: 0, skipped: 0, failed: 0 };

  const eligible = (org: OrgRecord): boolean => {
    const subscription = org.subscription;
    return (
      Boolean(org.emailReports?.on) &&
      Boolean(org.contactEmail) &&
      Boolean(subscription) &&
      hasAccess(subscription, now.getTime()) &&
      planFitsKind(subscription!.plan, org.kind) &&
      planAllows(subscription!.plan, "emailReports") &&
      planAllows(subscription!.plan, "reports")
    );
  };

  for (const org of await store.listOrgs(500)) {
    if (!org.emailReports?.on) continue;
    summary.considered += 1;
    if (!eligible(org) || org.emailReports.lastSentMonth === month) {
      summary.skipped += 1;
      continue;
    }
    const programmes = (await store.programmesByOwner(org.id)).filter(reporting).sort((a, b) => a.createdAt - b.createdAt);
    if (programmes.length === 0) {
      summary.skipped += 1;
      continue;
    }

    // Claim this month for this organisation before sending, so a repeat or a parallel run cannot send it again.
    let previous: string | undefined;
    let claimed = false;
    await store.updateOrg(org.id, (current) => {
      if (!current || !current.emailReports?.on || current.emailReports.lastSentMonth === month) return null;
      previous = current.emailReports.lastSentMonth;
      claimed = true;
      return { ...current, emailReports: { ...current.emailReports, lastSentMonth: month } };
    });
    if (!claimed) {
      summary.skipped += 1;
      continue;
    }

    let sent = false;
    try {
      const rows = [];
      for (const record of programmes) rows.push({ programme: (record.content ?? record.draft).name, display: displayCount((await counts.read(record.code))[month] ?? 0) });
      sent = await mail({ to: org.contactEmail as string, subject: `Your Recoverly report for ${monthLabel(month)}`, text: monthlyReportText(org.name, month, rows, portalUrl) });
    } catch {
      sent = false;
    }

    if (sent) summary.sent += 1;
    else {
      summary.failed += 1;
      // Give the month back so the next run tries again.
      await store.updateOrg(org.id, (current) => {
        if (!current?.emailReports || current.emailReports.lastSentMonth !== month) return null;
        const { on } = current.emailReports;
        return { ...current, emailReports: previous ? { on, lastSentMonth: previous } : { on } };
      });
    }
  }
  return summary;
}
