import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { WorkspaceTeam } from "@/components/workspace-team";
import { findWorkspaceByReportKey } from "@/lib/programme-register";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { callerKey } from "@/lib/request-guards";

// The key is in the address, so this page must not be indexed, cached or leak its address to other sites.
export const metadata: Metadata = {
  title: "Team workspace",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer"
};
export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

/**
 * An organisation's team workspace, at the same private address as its report
 * (`scripts/make-report-key.mjs`; the register holds only the key's hash). It exists only for a
 * clinic or community service whose register entry switches the workspace on: a workplace or a
 * college never has one, and any other address is a plain 404. The address proves the team to the
 * server for listing what people sent; reading it needs the team's own private key, which is made
 * and kept in the team's browser. See `lib/workspace.ts`.
 */
export default async function WorkspacePage({ params }: { params: Params }) {
  const { token } = await params;

  // Guessing addresses is pointless (256 random bits), but is still slowed down.
  const caller = rateLimit(`workspace-page:${callerKey({ headers: await headers() })}`, LIMITS.reportView.limit, LIMITS.reportView.windowMs);
  if (!caller.allowed) notFound();

  const team = findWorkspaceByReportKey(token);
  if (!team) notFound();

  return <WorkspaceTeam token={token} code={team.code} name={team.name} publicKey={team.publicKey} keyId={team.keyId} />;
}
