import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ProgrammeReport } from "@/components/programme-report";
import { adminDb } from "@/lib/firebase-admin";
import { buildReportRows } from "@/lib/programme-count";
import { firestoreCountStore } from "@/lib/programme-count-firestore";
import { findProgrammeByReportKey } from "@/lib/programme-register";
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
 * (`scripts/make-report-key.mjs`; the register holds only the key's hash). It shows the
 * anonymous headcount and nothing else: see `lib/programme-count.ts` for what that is
 * and why it cannot single anyone out. An address that matches nothing is a plain 404,
 * the same as any other page that does not exist.
 */
export default async function ProgrammeReportPage({ params }: { params: Params }) {
  const { token } = await params;

  // Guessing addresses is pointless (256 random bits), but is still slowed down.
  const caller = rateLimit(`report:${callerKey({ headers: await headers() })}`, LIMITS.reportView.limit, LIMITS.reportView.windowMs);
  if (!caller.allowed) notFound();

  const entry = findProgrammeByReportKey(token);
  if (!entry) notFound();

  let counts: Record<string, number> | null = null;
  try {
    counts = adminDb ? await firestoreCountStore(adminDb).read(entry.code) : null;
  } catch {
    counts = null;
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

  return <ProgrammeReport name={entry.name} rows={buildReportRows(counts, new Date())} />;
}
