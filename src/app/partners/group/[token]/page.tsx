import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ProgrammeReport } from "@/components/programme-report";
import { adminDb } from "@/lib/firebase-admin";
import { firestoreCountStore } from "@/lib/programme-count-firestore";
import { rollUpRows } from "@/lib/programme-group";
import { findGroupByKey } from "@/lib/programme-register";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { callerKey } from "@/lib/request-guards";

export const metadata: Metadata = { title: "Roll-up report", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

/**
 * A roll-up of several programmes (an NGO network's districts), at a private address like a report's. Each
 * programme counts toward a month only if it reaches the group size on its own, so this adds no detail a
 * programme's own report would not show (`lib/programme-group.ts`).
 */
export default async function GroupReportPage({ params }: { params: Params }) {
  const { token } = await params;
  const caller = rateLimit(`group:${callerKey({ headers: await headers() })}`, LIMITS.reportView.limit, LIMITS.reportView.windowMs);
  if (!caller.allowed) notFound();
  const found = findGroupByKey(token);
  if (!found) notFound();

  let rows = null;
  try {
    if (adminDb) {
      const store = firestoreCountStore(adminDb);
      const perProgramme: Record<string, Record<string, number>> = {};
      for (const member of found.members) perProgramme[member.code] = await store.read(member.code);
      rows = rollUpRows(perProgramme, new Date());
    }
  } catch {
    rows = null;
  }
  if (!rows) {
    return (
      <div lang="en" className="mx-auto max-w-xl">
        <p role="alert" className="text-sm leading-relaxed text-body">
          The figures are not available right now. Please try again in a little while.
        </p>
      </div>
    );
  }
  return (
    <ProgrammeReport
      name={found.group.name}
      rows={rows}
      groupNote={`This is a roll-up of ${found.members.length} programme${found.members.length === 1 ? "" : "s"}. A programme with fewer than 20 people counted in a month is left out of that month's figure, so the total can be lower than the real number.`}
    />
  );
}
