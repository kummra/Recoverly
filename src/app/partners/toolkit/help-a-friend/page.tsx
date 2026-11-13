import type { Metadata } from "next";

import { DocLink, DocList, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { HELPLINES } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Helping a friend who drinks too much",
  description: "A guide for students: how to notice, what to say, how to stay safe, and where to find help.",
  alternates: { canonical: "https://recoverly.co.in/partners/toolkit/help-a-friend" },
  robots: { index: false, follow: true }
};

export default function HelpAFriendPage() {
  return (
    <ToolkitDoc
      title="Helping a friend who drinks too much: a guide for students"
      intro="You are not their counsellor and you cannot make them stop. You can be a kind, steady friend and help them find real help."
    >
      <DocSection title="If it is an emergency, act now">
        <DocList
          items={[
            <>
              Passed out and cannot be woken, vomiting while drowsy, very slow breathing, a seizure, or confusion: call {HELPLINES.india.emergency}. Stay with them, turn them on their side, and do not leave them alone.
            </>,
            <>
              They talk about hurting themselves: stay, listen, and call Tele-MANAS {HELPLINES.india.teleManas} or {HELPLINES.india.emergency} with them. Tell a warden or an adult you trust.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="Noticing">
        <DocList items={["Missing classes, mood swings, drinking alone or in the morning, money trouble, hiding it, or hurting themselves or others.", "You do not need proof. You only need to care."]} />
      </DocSection>
      <DocSection title="What to say">
        <DocList
          items={[
            "Pick a calm, private moment when they are sober.",
            "Say 'I care about you and I have noticed...' and describe what you saw. Avoid 'you always' and labels.",
            "Listen more than you talk. Ask 'What would help?'",
            "Offer to come along to a counsellor, doctor or warden, or to look at help together.",
          ]}
        />
      </DocSection>
      <DocSection title="What not to do">
        <DocList
          items={[
            "Do not dare them, shame them, or tell the whole group.",
            "Do not cover for them again and again, or drink with them to 'keep an eye'.",
            <>
              Do not tell a heavy drinker to quit suddenly: it can be dangerous. A doctor should guide it (<DocLink href="/learn/stopping-alcohol-safely">read why</DocLink>).
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="Look after yourself">
        <DocList
          items={[
            <>
              It is hard to carry alone. Talk to a trusted adult, your campus counsellor, or Tele-MANAS {HELPLINES.india.teleManas}. The guide to <DocLink href="/learn/helping-someone-who-drinks">helping someone who drinks</DocLink> is free.
            </>,
          ]}
        />
      </DocSection>
    </ToolkitDoc>
  );
}
