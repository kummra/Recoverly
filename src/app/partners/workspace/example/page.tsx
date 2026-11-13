import type { Metadata } from "next";

import { WorkspaceExample } from "@/components/workspace-team";

export const metadata: Metadata = {
  title: "Example team workspace",
  description:
    "What a clinic's team sees if people in its programme choose to share their progress with it, by name. Invented people; the real thing is scrambled so only the team can read it.",
  alternates: { canonical: "https://recoverly.co.in/partners/workspace/example" }
};

/** `/partners/workspace/example`: how a team's workspace looks, with invented people and a notice that says so. */
export default function ExampleWorkspacePage() {
  return <WorkspaceExample />;
}
