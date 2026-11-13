import type { Metadata } from "next";

import { DocLink, DocList, DocPara, DocSection, ToolkitDoc } from "@/components/toolkit-doc";

export const metadata: Metadata = {
  title: "Compliance checklist for organisations",
  description: "A checklist to work through before offering Recoverly to your people: notice, consent, safety, records and who to ask.",
  alternates: { canonical: "https://recoverly.co.in/partners/compliance" },
  robots: { index: false, follow: true }
};

export default function CompliancePage() {
  return (
    <ToolkitDoc
      kicker="Recoverly compliance checklist"
      title="Before you offer Recoverly: a checklist"
      intro="Tick these off with your own HR, legal or data-protection adviser. It is a prompt for your conversation, not legal advice."
      back={{ href: "/partners", label: "Back to the organisations page" }}
    >
      <DocSection title="Tell people the truth">
        <DocList
          items={[
            "☐ Say plainly that joining is voluntary, that you are not told who joins, and that you cannot see what anyone logs.",
            "☐ If you receive the anonymous monthly report, say that people choose whether to be counted.",
            "☐ Do not link use of Recoverly to appraisals, discipline, pay, cover or treatment decisions.",
          ]}
        />
      </DocSection>
      <DocSection title="Safety and care">
        <DocList
          items={[
            "☐ Name a person who runs the launch session and who people can talk to.",
            "☐ Check that your own support contacts (the ones shown in the app) are correct, staffed and honest about their hours.",
            "☐ Agree what a manager does if someone discloses a problem or seems unsafe: use the disclosure protocol in the toolkit.",
            "☐ Remember the app is not treatment: heavy drinkers should see a doctor before stopping suddenly.",
          ]}
        />
      </DocSection>
      <DocSection title="Data protection">
        <DocList
          items={[
            "☐ Read the trust page and privacy policy, and have your adviser confirm the roles and any agreement you need.",
            "☐ Confirm where your own staff keep the private report link (it is a secret) and who has it.",
            "☐ Clinics and community services only: decide who holds the team's workspace passphrase and key file, and where they are backed up. Nobody can recover them for you.",
            "☐ Clinics only: confirm that no person is required to share as a condition of treatment.",
            "☐ Workplaces, colleges and insurers: the individual-level workspace is not available to you, by design.",
          ]}
        />
      </DocSection>
      <DocSection title="Ending a pilot">
        <DocList
          items={[
            "☐ Agree what happens at the end: whether the programme code stays, and who tells your people.",
            "☐ People can leave or delete their own data at any time in Settings.",
          ]}
        />
      </DocSection>
      <DocPara>
        {"See also "}
        <DocLink href="/trust">trust and security</DocLink>
        {" and "}
        <DocLink href="/partners/faq">questions organisations ask</DocLink>
        {"."}
      </DocPara>
    </ToolkitDoc>
  );
}
