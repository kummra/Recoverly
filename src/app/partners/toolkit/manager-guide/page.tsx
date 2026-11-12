import type { Metadata } from "next";

import { DocLink, DocList, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { HELPLINES } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Talking with a colleague you are worried about",
  description: "A guide for managers and HR on starting a kind, practical conversation with someone whose drinking worries them. Print it or save it as a PDF.",
  alternates: { canonical: "https://recoverly.co.in/partners/toolkit/manager-guide" },
  robots: { index: false, follow: true }
};

/**
 * Written for managers who are not clinicians and should not try to be. It never
 * asks them to judge whether someone has a drinking problem: it asks them to
 * describe what they see at work and point to help. The one health fact in it
 * (stopping suddenly can be dangerous for heavy drinkers) is the app's standing
 * safety message, in short form.
 */
export default function ManagerGuidePage() {
  return (
    <ToolkitDoc
      title="Talking with a colleague you are worried about: a guide for managers and HR"
      intro="You do not need to be an expert, and it is not your job to work out whether someone has a drinking problem. Your job is to notice what is happening at work, speak kindly and show the way to help. Check your organisation’s policy and the law before taking any formal step."
    >
      <DocSection title="Before you speak">
        <DocList
          items={[
            "Write down what you have seen at work in plain facts: dates, missed shifts, mistakes, safety near-misses. Leave out your guesses about why.",
            "Read your organisation’s policy and talk to HR first, so you know what you can offer and what has to follow.",
            "Choose a private, unhurried time and place. Not in front of others.",
            "If someone seems unfit to work safely, your safety policy comes first: keep them away from driving, machinery and other risks, make sure they get home safely, and talk afterwards.",
          ]}
        />
      </DocSection>

      <DocSection title="In the conversation">
        <DocList
          items={[
            "Start with care: “I have noticed some things at work and I am concerned about you.”",
            "Describe what you have seen, not what you think it means. Ask one open question, then listen. Let there be silence.",
            <>
              Say what help exists and let them choose: your own support route, a doctor, Tele-MANAS {HELPLINES.india.teleManas} (toll-free, any hour), or{" "}
              <DocLink href="/">Recoverly</DocLink> (free and private; your organisation cannot see who uses it).
            </>,
            "Be clear and fair about what you expect at work and what happens next, in line with your policy.",
            "Say honestly who needs to know and why. Do not promise a secrecy you cannot keep.",
            "Agree a time to check in, and keep it.",
          ]}
        />
      </DocSection>

      <DocSection title="Things to avoid">
        <DocList
          items={[
            "Labels such as “alcoholic”, and diagnosing. You are describing work, not a person’s health.",
            <>
              Telling them to “just stop”. Stopping suddenly can be dangerous for someone who drinks heavily, so encourage them to see a doctor first (the{" "}
              <DocLink href="/learn/stopping-alcohol-safely">stopping-safely guide</DocLink> explains why).
            </>,
            "Arguing, demanding proof, or asking for a promise.",
            "Discussing it with colleagues, or letting your team guess.",
          ]}
        />
      </DocSection>

      <DocSection title="If it is an emergency">
        <DocList
          items={[
            <>
              A seizure, severe confusion, seeing or hearing things that are not there, or a collapse: call {HELPLINES.india.emergency}. The{" "}
              <DocLink href="/learn/stopping-alcohol-safely">stopping-safely guide</DocLink> lists more signs.
            </>,
            <>
              They talk about harming themselves: stay with them, do not leave them alone, and call Tele-MANAS {HELPLINES.india.teleManas} or {HELPLINES.india.emergency} together.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Afterwards">
        <DocList
          items={[
            "Follow up kindly, even if the first conversation went badly. Change can take time and several tries.",
            "Keep your notes factual and private.",
            <>
              Look after yourself. These conversations are hard, so talk to HR or your own support route. Our guide to{" "}
              <DocLink href="/learn/helping-someone-who-drinks">helping someone who drinks</DocLink> is written for families, and much of it applies.
            </>,
          ]}
        />
      </DocSection>
    </ToolkitDoc>
  );
}
