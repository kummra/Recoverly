import type { Metadata } from "next";

import { DocLink, DocList, DocPara, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Trust and security",
  description: "How Recoverly protects people's privacy, what an organisation can and cannot see, and where the limits are. Plain language, for procurement and IT teams.",
  alternates: { canonical: "https://recoverly.co.in/trust" }
};

const BACK = { href: "/partners", label: "Back to the organisations page" };

/** Every statement here is something the code does and a test or a recorded check backs. See CLAUDE.md "Summary links, the headcount, progress figures and the team workspace". */
export default function TrustPage() {
  return (
    <ToolkitDoc
      kicker="Recoverly trust and security"
      title="How we protect the people who use Recoverly"
      intro="Recoverly is built so that an organisation can support its people without being able to watch them. This page says what that means in practice, and where its limits are."
      back={BACK}
      footerNote="This page describes the product as built. It is not a legal document, a certification or a guarantee. Recoverly has not yet been independently audited or penetration-tested."
    >
      <DocSection title="What an organisation can see by default: nothing">
        <DocList
          items={[
            "Joining with a programme code puts the organisation's name and support contacts on the person's own device. The organisation is not told who joined and cannot see anything anyone logs.",
            "The person's records, goals and chats belong to their own account. Access rules allow only that person to read them.",
            "There is no advertising, no tracking for advertisers and no selling of data.",
          ]}
        />
      </DocSection>

      <DocSection title="What a person may choose to add (each is off until they turn it on)">
        <DocList
          items={[
            "An anonymous monthly headcount: once a month the device adds one to a total for the programme. No name, account or list is stored. The organisation sees a figure only when at least 20 people are counted, rounded to the nearest 5.",
            "Two anonymous progress figures about last month (days with no drink, and whether they drank less than the month before), added into group averages in the same way and shown only for groups of 20 or more.",
            "A summary link for their own doctor or someone they trust: scrambled (end-to-end encrypted) on their device, so we cannot read it. Only what they tick goes in. It ends after 1, 7 or 30 days or when they stop it.",
            "A team workspace, only for a clinic or community service: the person shares their own summary by name with that team. It is encrypted on their device to a key that exists only in the team's own browser, so we cannot read it. It lasts 30 days after the last send, nothing is sent in the background, and stopping, leaving the programme or deleting the account removes it.",
          ]}
        />
      </DocSection>

      <DocSection title="What is never allowed, whatever anyone agrees">
        <DocList
          items={[
            "An employer, college, insurer, TPA or government body never receives individual-level data. Consent given to your own employer or insurer is not freely given, so the software refuses it: a workspace cannot be switched on for a workplace or a college.",
            "No list of who joined, no count shown below 20 people, nothing live that could reveal one person.",
          ]}
        />
      </DocSection>

      <DocSection title="Where the data lives">
        <DocPara>
          {"The app runs on Vercel and stores accounts and records with Google Firebase (Authentication and Firestore). Data is encrypted in transit and at rest by those providers. Browsers cannot read the server-only collections used for sharing and counting, and this was checked against the real security rules. We have not yet confirmed India-only data residency, so do not assume it."}
        </DocPara>
      </DocSection>

      <DocSection title="Data protection (DPDP Act 2023): an outline for your lawyer">
        <DocList
          items={[
            "Roles: Recoverly decides what is collected and why, so treat it as the data fiduciary for individuals' own data. For the anonymous counts an organisation receives, no personal data is shared with it.",
            "Purposes: recovery tracking and guidance for the individual; the optional counts and shares described above, each on the person's own choice.",
            "Retention and deletion: a person can delete their account and data in Settings, which also removes their summary links and team copies. Enquiries and survey answers are kept until the person asks for deletion.",
            "Children: Recoverly is not directed at children; a lawyer should confirm the age and parental-consent position before a college or school programme.",
            "Breach contact and grievance contact: the address below. A written breach-response plan is still to be agreed with counsel.",
          ]}
        />
      </DocSection>

      <DocSection title="Known limits, stated plainly">
        <DocList
          items={[
            "A clinic's staff can read, print or pass on what people choose to send them, and nothing can take that back.",
            "A person on two devices can be counted twice in the headcount, and people who do not tick are not counted. The report says so.",
            "An organisation that made many accounts could pad a small total past 20. The threshold protects people from casual identification, not from a determined insider.",
            "The translations of the privacy text have not been reviewed by native speakers; the English version governs.",
            "The AI companion is a support tool, not a counsellor, and its guides have not yet had a clinical review.",
          ]}
        />
      </DocSection>

      <DocSection title="Reporting a security problem">
        <DocPara>
          {"Email "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          {" with what you found and how to reproduce it. Please do not access other people's data or disrupt the service while testing. We will reply and fix real problems. Our machine-readable contact is at "}
          <a className="underline" href="/.well-known/security.txt">
            /.well-known/security.txt
          </a>
          {". Full privacy text: "}
          <DocLink href="/privacy">privacy policy</DocLink>
          {"."}
        </DocPara>
      </DocSection>
    </ToolkitDoc>
  );
}
