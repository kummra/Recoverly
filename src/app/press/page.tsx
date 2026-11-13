import type { Metadata } from "next";

import { DocList, DocPara, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Recoverly fact sheet",
  description: "A one-page summary of Recoverly for journalists, judges and partners: what it is, what exists today, and what does not exist yet.",
  alternates: { canonical: "https://recoverly.co.in/press" }
};

/** Only claims that are true today. Keep it that way: built and live, not launched commercially. */
export default function PressPage() {
  return (
    <ToolkitDoc
      kicker="Recoverly fact sheet"
      title="Recoverly in one page"
      intro="A free, private, multilingual companion for people in India who want to cut down or stop drinking, with tools for the organisations that support them."
      back={{ href: "/", label: "Back to Recoverly" }}
      footerNote="Facts as of November 2026. Recoverly is built and live but has not launched commercially: there are no paying customers and no revenue yet."
    >
      <DocSection title="What exists today">
        <DocList
          items={[
            "A live web app at recoverly.co.in, free for individuals, in nine Indian languages.",
            "Drink and craving tracking, goals, a self-check (the WHO AUDIT), plans for hard moments, an AI support companion (not a counsellor), and guides checked against WHO, NHS and Government of India sources.",
            "Safety first: helplines (Tele-MANAS 14416 and 112) are always one tap away, and the app warns that stopping suddenly can be dangerous for heavy drinkers.",
            "For organisations: programme codes, a toolkit (posters with QR codes, a session outline, a manager guide), an anonymous monthly report, and a private team workspace for clinics and community services.",
          ]}
        />
      </DocSection>
      <DocSection title="What makes it different">
        <DocList
          items={[
            "Privacy by design: an organisation cannot see who uses it. A person can choose to share a summary with their doctor, encrypted so we cannot read it.",
            "An employer, college or insurer never receives an individual's information, even with consent.",
            "Built for Indian languages and low-cost phones, not translated as an afterthought.",
          ]}
        />
      </DocSection>
      <DocSection title="What does not exist yet">
        <DocList
          items={[
            "No paying customers, no revenue and no completed pilot.",
            "No clinical review of the guides yet; we are looking for clinical advisers.",
            "No independent security audit, and translations not yet reviewed by native speakers.",
          ]}
        />
      </DocSection>
      <DocSection title="Contact">
        <DocPara>
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </DocPara>
      </DocSection>
    </ToolkitDoc>
  );
}
