import type { Metadata } from "next";

import { DocLink, DocList, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { HELPLINES } from "@/lib/safety";

export const metadata: Metadata = {
  title: "If someone tells you they have a drinking problem",
  description: "A short protocol for managers, wardens and team leaders: what to say, what to do, what not to do, and when to call for help.",
  alternates: { canonical: "https://recoverly.co.in/partners/toolkit/disclosure-protocol" },
  robots: { index: false, follow: true }
};

/** Safety text: the numbers come from `lib/safety.ts`, so they cannot drift from the app. */
export default function DisclosureProtocolPage() {
  return (
    <ToolkitDoc
      title="If someone tells you they have a drinking problem: a one-page protocol"
      intro="Being told is a sign of trust and of courage. You do not have to fix anything. You need to listen, keep people safe, and point to help. Adapt this to your organisation's policy and the law."
    >
      <DocSection title="1. In the moment">
        <DocList
          ordered
          items={[
            "Stop what you are doing and give your full attention. Choose privacy.",
            "Say thank you for telling you. Do not look shocked or judge.",
            "Listen. Ask 'What would help right now?' Do not diagnose or label.",
            "Do not promise secrecy you cannot keep. Say who might need to know and why.",
          ]}
        />
      </DocSection>
      <DocSection title="2. Check safety first">
        <DocList
          items={[
            <>
              If they are in danger, have had a seizure, are confused or collapsed: call {HELPLINES.india.emergency} now.
            </>,
            <>
              If they talk about harming themselves: stay with them, and call Tele-MANAS {HELPLINES.india.teleManas} (or {HELPLINES.india.teleManasAlt}) or {HELPLINES.india.emergency} together.
            </>,
            "If they appear unfit to work safely (driving, machinery, heights, patients), follow your safety policy and make sure they get home safely. Do not let them drive.",
            <>
              Do not tell a heavy drinker to stop suddenly: it can be dangerous. Encourage them to see a doctor first (<DocLink href="/learn/stopping-alcohol-safely">the stopping-safely guide</DocLink>).
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="3. Point to help and let them choose">
        <DocList
          items={[
            "Your own support route (EAP, counsellor, warden, clinic) if there is one.",
            "A doctor or a de-addiction service.",
            <>
              Tele-MANAS {HELPLINES.india.teleManas}, free and open at any hour, and the free, private <DocLink href="/">Recoverly</DocLink> app.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="4. Afterwards">
        <DocList
          items={[
            "Write down what was said and done in plain facts, and keep it private.",
            "Tell only the people who need to know under your policy, and tell the person you are doing so.",
            "Agree a follow-up time and keep it. Treat them as you would after any health disclosure: no punishment for asking for help.",
            "Look after yourself. Talk to HR or your own support route.",
          ]}
        />
      </DocSection>
      <DocSection title="Never">
        <DocList items={["Gossip, or share it with the team.", "Make a promise of a job, cover or outcome.", "Demand proof, a promise to quit, or a test.", "Use what you were told against the person."]} />
      </DocSection>
    </ToolkitDoc>
  );
}
