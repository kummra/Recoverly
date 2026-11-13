import type { Metadata } from "next";

import { DocLink, DocList, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { HELPLINES } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Orientation outline and peer-ambassador pack",
  description: "A short outline a college can use at orientation, and a one-page pack for student peer ambassadors.",
  alternates: { canonical: "https://recoverly.co.in/partners/toolkit/orientation" },
  robots: { index: false, follow: true }
};

export default function OrientationPage() {
  return (
    <ToolkitDoc
      title="College orientation outline and peer-ambassador pack"
      intro="A 15-minute slot for orientation week, plus a one-page brief for students who volunteer to be a friendly first point of contact. Keep it light, honest and free of fear tactics."
    >
      <DocSection title="15-minute orientation slot">
        <DocList
          ordered
          items={[
            "Minutes 0-3: why we are talking about this. Many students try alcohol, some find it hard to control, and asking for help early is normal.",
            "Minutes 3-7: what 'low-risk' and 'risky' look like in plain terms, and that stopping suddenly after heavy drinking can be dangerous. Point to the free guides.",
            <>
              Minutes 7-10: where to get help: your campus counsellor, Tele-MANAS {HELPLINES.india.teleManas} (free, any hour), and {HELPLINES.india.emergency} in an emergency.
            </>,
            "Minutes 10-13: show the poster and the free, private Recoverly app. Say clearly that the college cannot see who uses it.",
            "Minutes 13-15: questions, and a reminder that no one will be judged.",
          ]}
        />
      </DocSection>
      <DocSection title="Peer-ambassador brief (one page)">
        <DocList
          items={[
            "You are a friendly first contact, not a counsellor. You do not diagnose, and you do not keep serious risks secret.",
            <>
              Know the <DocLink href="/partners/toolkit/help-a-friend">help-a-friend guide</DocLink> and the numbers above.
            </>,
            "If a friend is in danger: call 112, stay with them, and tell a warden or counsellor.",
            "Do not collect names or stories. Point people to the counsellor and to Recoverly.",
            "Take care of yourself: you may step back at any time and talk to the counsellor.",
          ]}
        />
      </DocSection>
      <DocSection title="Checklist for the college">
        <DocList items={["Print the poster and put it in hostels, the library and the counselling centre.", "Brief the counsellor and wardens on the disclosure protocol.", "Check the support contacts in your programme are right."]} />
        <p className="text-sm text-body">
          <DocLink href="/partners/toolkit/disclosure-protocol">Disclosure protocol</DocLink>
          {" · "}
          <DocLink href="/partners/toolkit/poster">Poster maker</DocLink>
        </p>
      </DocSection>
    </ToolkitDoc>
  );
}
