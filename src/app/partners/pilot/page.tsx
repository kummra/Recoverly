import type { Metadata } from "next";

import { DocLink, DocList, DocPara, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Pilot kit",
  description: "A one-page pilot proposal, success measures and a case-study template for running a Recoverly pilot.",
  alternates: { canonical: "https://recoverly.co.in/partners/pilot" },
  robots: { index: false, follow: true }
};

export default function PilotKitPage() {
  return (
    <ToolkitDoc
      kicker="Recoverly pilot kit"
      title="Running a Recoverly pilot: proposal, measures and case study"
      intro="A pilot is a short, honest trial: a group of people gets Recoverly, you agree beforehand how you will judge it, and you write down what happened. Print this page and fill in the blanks."
      back={{ href: "/partners", label: "Back to the organisations page" }}
    >
      <DocSection title="1. One-page proposal (fill in and sign off)">
        <DocList
          ordered
          items={[
            "Organisation: ______________  Contact person: ______________  Programme code to be used: ______________",
            "Group: who will be offered it (for example 'drivers at the Pune depot', 'first-year hostel residents', 'patients leaving the de-addiction ward'). Approximate size: ____ (aim for at least 40, so the anonymous figures can appear).",
            "Length: 90 days from ______ to ______.",
            "What Recoverly provides: the free app in the person's language, your name and support contacts on their dashboard, a poster and QR code, a 45-minute session outline, and the anonymous monthly report if you ask for it. A clinic or community service can also have the private team workspace.",
            "What Recoverly does not do: give medical advice or treatment, tell you who joined, or show you what anyone logs.",
            "What you provide: a named person to run the launch session, a place for the poster, and your support contacts.",
            "Cost: ______________ (to be agreed; individuals always use Recoverly free).",
            "Either side can stop at any time by writing to us. Data handling is as described on the trust page.",
          ]}
        />
      </DocSection>

      <DocSection title="2. Success measures (agree these before you start)">
        <DocList
          items={[
            "Reach: how many people were offered the code, and how many were counted in the monthly report (the report shows this only once 20 or more are counted).",
            "Stay: the monthly report's trend over the 90 days. People choose whether to be counted, so say honestly that it understates use.",
            "Progress (only where the organisation has progress figures switched on): the average share of days with no drink, for groups of 20 or more. These are self-reported figures, not clinical outcomes.",
            "Experience: two or three short comments from the person who ran the session, and from people who volunteer, written without names.",
            "Safety: any concern raised, and how it was handled.",
          ]}
        />
        <DocPara>{"Decide in advance what result would make you continue, change or stop."}</DocPara>
      </DocSection>

      <DocSection title="3. Case-study template (write this at the end)">
        <DocList
          items={[
            "The situation: who you support and why drinking was a concern.",
            "What we did: the launch session, poster placement, how people were told it is private.",
            "What happened: the numbers from the report, with the date range, and what they do and do not show.",
            "What people said: two or three comments, with no names.",
            "What we would change next time.",
            "Permission: confirm in writing that the organisation agrees to the case study being shared and in what form.",
          ]}
        />
      </DocSection>

      <DocSection title="Next">
        <DocPara>
          {"See the "}
          <DocLink href="/partners/toolkit">toolkit</DocLink>
          {" for posters and the session outline, the "}
          <DocLink href="/trust">trust page</DocLink>
          {" for how privacy works, and write to "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          {" to start."}
        </DocPara>
      </DocSection>
    </ToolkitDoc>
  );
}
