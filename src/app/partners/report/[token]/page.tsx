import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { PlanEndedNotice } from "@/components/plan-ended-notice";
import { ProgrammeReport } from "@/components/programme-report";
import { adminDb } from "@/lib/firebase-admin";
import { directory } from "@/lib/org/server";
import { CHALLENGE_SUFFIX, buildReportRows } from "@/lib/programme-count";
import { buildOutcomeRows } from "@/lib/programme-outcomes";
import { firestoreCountStore } from "@/lib/programme-count-firestore";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { callerKey } from "@/lib/request-guards";

// The key is in the address, so this page must not be indexed, cached or leak its address to other sites.
export const metadata: Metadata = {
  title: "Programme report",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer"
};
export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

/**
 * An organisation's private monthly report, at an address only it has been given
 * (`scripts/make-report-key.mjs`, or made in the organisation portal; only the key's hash is kept). It shows the
 * anonymous headcount and nothing else: see `lib/programme-count.ts` for what that is
 * and why it cannot single anyone out. An address that matches nothing is a plain 404,
 * the same as any other page that does not exist.
 */
export default async function ProgrammeReportPage({ params }: { params: Params }) {
  const { token } = await params;

  // Guessing addresses is pointless (256 random bits), but is still slowed down.
  const caller = rateLimit(`report:${callerKey({ headers: await headers() })}`, LIMITS.reportView.limit, LIMITS.reportView.windowMs);
  if (!caller.allowed) notFound();

  const entry = await directory.findProgrammeByReportKey(token);
  if (!entry) {
    // A real address whose organisation has no active plan is told so, not given a bare 404.
    const lapsed = await directory.findLapsedByKey(token);
    if (lapsed) return <PlanEndedNotice name={lapsed.name} />;
    notFound();
  }

  let counts: Record<string, number> | null = null;
  let challenge: Record<string, number> | null = null;
  let figures: Awaited<ReturnType<ReturnType<typeof firestoreCountStore>["readFigures"]>> | null = null;
  try {
    if (adminDb) {
      const store = firestoreCountStore(adminDb);
      counts = await store.read(entry.code);
      // The progress table exists only for an organisation that has agreed to receive it.
      if (entry.figures) figures = await store.readFigures(entry.code);
      // The optional dry-month challenge count, kept beside the headcount.
      if (entry.challenge) challenge = await store.read(`${entry.code}${CHALLENGE_SUFFIX}`);
    }
  } catch {
    counts = null;
    figures = null;
  }

  if (!counts) {
    return (
      <div lang="en" className="mx-auto max-w-xl">
        <p role="alert" className="text-sm leading-relaxed text-body">
          The figures are not available right now. Please try again in a little while.
        </p>
      </div>
    );
  }

  const now = new Date();
  return <ProgrammeReport name={entry.name} rows={buildReportRows(counts, now)} outcomes={figures ? buildOutcomeRows(figures, now) : undefined} challengeRows={challenge ? buildReportRows(challenge, now) : undefined} />;
}
