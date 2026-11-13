import type { Metadata } from "next";

import { DocLink, DocPara, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Questions organisations ask",
  description: "Straight answers for HR, clinics, colleges and IT teams: what data Recoverly holds, who can see it, deletion, pricing and support.",
  alternates: { canonical: "https://recoverly.co.in/partners/faq" }
};

const QA: Array<[string, string]> = [
  ["Can we see who in our organisation uses Recoverly?", "No. A programme code only puts your name and support contacts on a person's own device. You are not told who joined. If a person chooses to be counted, you receive an anonymous monthly total, and only once at least 20 people are counted."],
  ["Can we see what our people log, or how they are doing?", "No. At most, if you ask for it and people choose it, you see group averages of two progress figures for groups of 20 or more. A clinic or community service can also receive a summary that a person chooses to share with its team, by name. Employers, colleges and insurers can never receive individual information, even with consent."],
  ["Where is the data stored, and who can read it?", "Accounts and records are stored with Google Firebase, and the app runs on Vercel. Only the person can read their own records. Summary links and team workspace copies are encrypted on the person's device so Recoverly cannot read them. See the trust page for the limits."],
  ["Can an employee be forced to share?", "Not through the software. Sharing with a team is only available to clinics and community services, each person must tick that they understand and press a button, and nothing is sent in the background. You should still never make it a condition of care or employment."],
  ["What happens when someone leaves or deletes their account?", "They can delete everything in Settings, which also removes their summary links and any copy shared with a team. Leaving a programme also stops sharing with its team. Counts already added to an anonymous total cannot be taken back, but they identify nobody."],
  ["Is Recoverly medical treatment?", "No. It is a support and information tool. It does not diagnose, treat or give medical advice, and it points to helplines (Tele-MANAS 14416, and 112 in an emergency). Its guides have not yet had a clinical review."],
  ["Which languages?", "Nine: English, Hindi, Marathi, Punjabi, Tamil, Telugu, Kannada, Malayalam and Gujarati. The pages for organisations, such as this one, are English."],
  ["What does it cost?", "Individuals use it free, always. Pricing for organisations has not been set: we are running pilots first and will set prices from what they show. Recoverly has not launched commercially and has no paying customers yet."],
  ["What do we need to do to start?", "Write to us or use the enquiry form. We agree a pilot, give you a programme code, a poster and a launch session outline, and, if you ask, a private report link."],
  ["Does it comply with Indian data protection law?", "It was designed around data minimisation and consent, but we have not had a legal review or an independent audit, so ask your own counsel to review it with you. The trust page has an outline for them."],
  ["Who do we call if something goes wrong?", "Write to the contact address below. For anyone in danger, the app and this site show Tele-MANAS 14416 and 112."]
];

export default function OrgFaqPage() {
  return (
    <ToolkitDoc
      kicker="Recoverly for organisations"
      title="Questions organisations ask"
      intro="Short, honest answers. If yours is not here, write to us."
      back={{ href: "/partners", label: "Back to the organisations page" }}
      footerNote="Answers describe the product as built. They are not legal advice."
    >
      {QA.map(([q, a]) => (
        <DocSection key={q} title={q}>
          <DocPara>{a}</DocPara>
        </DocSection>
      ))}
      <DocPara>
        {"More: "}
        <DocLink href="/trust">trust and security</DocLink>
        {", "}
        <DocLink href="/partners/compliance">compliance checklist</DocLink>
        {", "}
        <DocLink href="/partners/pilot">pilot kit</DocLink>
        {". Contact: "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </DocPara>
    </ToolkitDoc>
  );
}
