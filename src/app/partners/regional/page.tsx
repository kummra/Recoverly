import type { Metadata } from "next";

import { DocLink, DocList, DocPara, DocSection, ToolkitDoc } from "@/components/toolkit-doc";

export const metadata: Metadata = {
  title: "Regional partners",
  description: "How a regional organisation, NGO network or reseller can bring Recoverly to its area: what you would do and what we provide.",
  alternates: { canonical: "https://recoverly.co.in/partners/regional" },
  robots: { index: false, follow: true }
};

export default function RegionalPartnersPage() {
  return (
    <ToolkitDoc
      kicker="Recoverly regional partners"
      title="Bringing Recoverly to your region"
      intro="If you work with many clinics, employers, colleges or field teams in an area, you can be the local face of Recoverly. This is a proposal to discuss, not a signed programme."
      back={{ href: "/partners", label: "Back to the organisations page" }}
      footerNote="No regional partnership exists yet. Terms, pricing and any revenue share would be agreed in writing first."
    >
      <DocSection title="What you would do">
        <DocList
          items={[
            "Introduce Recoverly to organisations in your area and run the launch sessions with the toolkit.",
            "Be the first contact for local questions, in your language.",
            "Help organisations choose their support contacts and keep them current.",
            "Report back what works and what does not.",
          ]}
        />
      </DocSection>
      <DocSection title="What we provide">
        <DocList
          items={[
            "The app, free for individuals, in nine languages.",
            "The toolkit: posters with QR codes, a session outline, manager and disclosure guides, and the pilot kit.",
            "A separate programme code for each organisation, and its anonymous monthly report.",
            "Honest answers on privacy: see the trust page.",
          ]}
        />
      </DocSection>
      <DocSection title="What stays fixed for everyone">
        <DocPara>
          {"Whoever brings Recoverly to an organisation, nobody receives an individual's information except a clinic or community service team that a person has chosen to share with. Partners cannot see who uses the app."}
        </DocPara>
      </DocSection>
      <DocSection title="Start a conversation">
        <DocPara>
          {"Use the "}
          <DocLink href="/partners#enquire">enquiry form</DocLink>
          {" and tell us your region and the organisations you work with. See also the "}
          <DocLink href="/partners/pilot">pilot kit</DocLink>
          {"."}
        </DocPara>
      </DocSection>
    </ToolkitDoc>
  );
}
