import type { Metadata } from "next";

import { DocLink, DocList, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { HELPLINES } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Patient handout for clinics",
  description: "A one-page handout a clinic can give patients: how to use Recoverly, what the clinic can and cannot see, and who to call.",
  alternates: { canonical: "https://recoverly.co.in/partners/toolkit/clinic-handout" },
  robots: { index: false, follow: true }
};

export default function ClinicHandoutPage() {
  return (
    <ToolkitDoc
      title="Patient handout: using Recoverly between visits"
      intro="Print this page. Write your clinic's code in the box, or use the poster maker to add your code and QR to a poster."
    >
      <DocSection title="Your clinic's programme code: ____________________">
        <DocList
          ordered
          items={[
            "Open recoverly.co.in on your phone and make a free account.",
            "In Settings, enter the code above. The clinic's name and contacts appear on your dashboard.",
            "Log your drinks and cravings, set a goal, and use the plans for hard moments.",
            "Before a visit, open the summary page to see your progress, and show it to your doctor.",
          ]}
        />
      </DocSection>
      <DocSection title="What the clinic can and cannot see">
        <DocList
          items={[
            "The clinic does not see that you joined or what you log.",
            "Only if you choose, you can share your own summary with the clinic team, by a name you give. It is scrambled so that Recoverly cannot read it. You tick that you understand, you decide what to include, and you can stop at any time. Sharing is never a condition of your treatment.",
          ]}
        />
      </DocSection>
      <DocSection title="Important">
        <DocList
          items={[
            "Do not stop drinking suddenly if you drink heavily: it can be dangerous. Talk to your doctor first.",
            <>
              In a crisis: Tele-MANAS {HELPLINES.india.teleManas} (free, any hour) or {HELPLINES.india.emergency}.
            </>,
            "Recoverly is a support tool, not treatment.",
          ]}
        />
        <p className="text-sm text-body">
          <DocLink href="/partners/toolkit/poster">Make a poster with your code and QR</DocLink>
        </p>
      </DocSection>
    </ToolkitDoc>
  );
}
