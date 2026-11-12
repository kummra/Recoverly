import type { Metadata } from "next";

import { DocLink, DocList, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { HELPLINES } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Session outline: alcohol awareness and support",
  description: "A 45-minute outline for running an alcohol awareness and support session at a workplace, college or clinic. Print it or save it as a PDF.",
  alternates: { canonical: "https://recoverly.co.in/partners/toolkit/session-outline" },
  robots: { index: false, follow: true }
};

const t = createTranslator("en");

/**
 * A facilitator's outline. It deliberately adds no health facts of its own: every
 * fact a session needs is in the Learn guides, which are checked against
 * public-health sources; the one safety message is read from the app's own
 * reviewed text so it can never drift from what the app says; and the emergency
 * signs are a subset of the "Signs that are an emergency" list in the stopping-safely
 * guide (which both documents link to). Keep it that way.
 */
export default function SessionOutlinePage() {
  return (
    <ToolkitDoc
      title="Alcohol awareness and support: a 45-minute session outline"
      intro="For HR teams, college counsellors, clinic staff, NGO field workers and anyone asked to run a session. It is an outline to adapt, not a script, and you do not need to be a clinician to use it. The aim: everyone leaves knowing where to get help, and nobody feels singled out."
    >
      <DocSection title="Before you start">
        <DocList
          items={[
            <>
              Read the four guides you will point to. They hold the facts, and this outline adds none of its own (the safety message and the emergency signs below are taken from the app and from these guides):{" "}
              <DocLink href="/learn/standard-drink-india">what a standard drink is</DocLink>, <DocLink href="/learn/coping-with-alcohol-cravings">coping with cravings</DocLink>,{" "}
              <DocLink href="/learn/stopping-alcohol-safely">stopping safely</DocLink> and <DocLink href="/learn/helping-someone-who-drinks">helping someone who drinks</DocLink>.
            </>,
            <>
              Put Tele-MANAS {HELPLINES.india.teleManas} and emergency {HELPLINES.india.emergency} on a slide or on the wall for the whole session.
            </>,
            "Know your organisation’s own route to help (an employee assistance line, a counsellor, HR) and be ready to say it out loud.",
            <>
              Print the <DocLink href="/partners/toolkit">poster or pocket cards</DocLink> for the door.
            </>,
            "Decide who will stay behind to talk one to one, and where.",
          ]}
        />
      </DocSection>

      <DocSection title="The 45 minutes">
        <DocList
          ordered
          items={[
            <>
              <strong>Welcome and ground rules (5 min).</strong> Say that nobody will be asked whether they drink, nobody has to speak, and what is said stays in the room.
              Say honestly that if someone tells you that they or someone else is in danger, you will help them get help.
            </>,
            <>
              <strong>Why we are talking about it (5 min).</strong> Alcohol touches families and workplaces. The aim is support and information, not blame.
            </>,
            <>
              <strong>What counts as a drink (8 min).</strong> A peg, a bottle of beer and a glass of wine are different amounts. Ask people to guess, then look it up together
              in the <DocLink href="/learn/standard-drink-india">standard drink guide</DocLink>.
            </>,
            <>
              <strong>Cravings, and what helps (8 min).</strong> Show the Craving SOS button in the app on a projected phone. Ask one open question (&ldquo;what is one thing that
              helps you wait out an urge?&rdquo;), take a few answers, and never press anyone to speak. See the{" "}
              <DocLink href="/learn/coping-with-alcohol-cravings">cravings guide</DocLink>.
            </>,
            <>
              <strong>The safety message (5 min).</strong> Put this on a slide and read it aloud, word for word: &ldquo;{t("safety.withdrawalBody")}&rdquo;
            </>,
            <>
              <strong>Helping someone else (8 min).</strong> Walk through the <DocLink href="/learn/helping-someone-who-drinks">guide for family and friends</DocLink>. If managers
              are in the room, hand them the <DocLink href="/partners/toolkit/manager-guide">manager conversation guide</DocLink>.
            </>,
            <>
              <strong>Where to get help (4 min).</strong> The two numbers on the wall, your own route, and the app (point at the QR code). Say that Recoverly is free and
              private, and that your organisation cannot see who uses it.
            </>,
            <>
              <strong>Close (2 min).</strong> Thank people and say who is staying behind for one-to-one questions.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="If someone is unwell or distressed in the room">
        <DocList
          items={[
            <>
              A seizure, severe confusion, seeing or hearing things that are not there, or a collapse: call {HELPLINES.india.emergency}. The{" "}
              <DocLink href="/learn/stopping-alcohol-safely">stopping-safely guide</DocLink> lists more signs.
            </>,
            <>
              Someone says they want to harm themselves: stay with them, do not leave them alone, and call Tele-MANAS {HELPLINES.india.teleManas} or {HELPLINES.india.emergency} together.
            </>,
            "Someone talks about their own drinking: thank them, do not question them, point to the numbers and the app, and do not promise a secrecy you cannot keep.",
          ]}
        />
      </DocSection>

      <DocSection title="What not to do">
        <DocList
          items={[
            "Do not diagnose, use labels such as “alcoholic”, or guess who might have a problem.",
            "Do not give medical advice, and never tell anyone to stop drinking suddenly.",
            "Do not ask people to share or to raise a hand. Do not note who asks questions or who stays behind.",
            "Do not present the app as a replacement for treatment. It is a support companion.",
          ]}
        />
      </DocSection>

      <DocSection title="After the session">
        <DocList
          items={[
            "Leave the posters and cards where people can take one without being seen.",
            "Send a short reminder of the help routes in two to four weeks.",
            "Note which questions came up, for next time. Tell us what worked, at the address on our organisations page.",
          ]}
        />
      </DocSection>
    </ToolkitDoc>
  );
}
