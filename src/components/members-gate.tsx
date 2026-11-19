import type { ReactNode } from "react";

import { MembersOnly } from "@/components/members-only";
import { currentMember } from "@/lib/org/member";

/**
 * Shows its children only to a member: someone signed in whose organisation has an active plan that includes the
 * toolkit. Anyone else sees the door (`MembersOnly`). The check runs on the server for every request, and the children
 * are never rendered, so nothing behind the door is in the page that is sent.
 */
export async function MembersGate({ path, title, summary, children }: { path: string; title: string; summary: string; children: ReactNode }) {
  return (await currentMember()) ? <>{children}</> : <MembersOnly path={path} title={title} summary={summary} />;
}
