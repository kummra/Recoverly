import type { Metadata } from "next";

import { CopyButton } from "@/components/copy-button";
import { DocLink, DocList, DocPara, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { HELPLINES } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Awareness campaign kit",
  description: "A calendar of the moments when drinking risk rises, and ready-to-send messages for WhatsApp, noticeboards and email.",
  alternates: { canonical: "https://recoverly.co.in/partners/toolkit/campaigns" },
  robots: { index: false, follow: true }
};

const CALENDAR: Array<[string, string]> = [
  ["New academic year / freshers' week", "New freedom and peer pressure. Use the orientation outline and put posters in hostels."],
  ["Festivals and celebrations (Holi, Diwali, New Year, weddings)", "Drinking rises and so does drink-driving. Send the 'plan your night' message a few days before."],
  ["Long weekends and match nights", "Plan the ride home and the next morning. Share the safe-travel message."],
  ["Pay day and month end", "Money stress and spending. Share the 'no judgement, just a number to call' message."],
  ["Dry-month moments (January, or your own)", "Invite people to try a drink-free month. Remind them that heavy drinkers should see a doctor before stopping suddenly."],
  ["Exam and appraisal seasons", "Stress is a common trigger. Share the 'stress and a drink' message."]
];

const MESSAGES: Array<[string, string]> = [
  ["Plan your night", `A celebration coming up? Decide before you go: how much, who is driving, how you get home. If you want a private place to plan, Recoverly is free and your organisation cannot see who uses it: https://recoverly.co.in`],
  ["Safe travel", `Never drive after drinking. Book a cab or ask a sober friend before the event, not during it. If you or someone near you is in danger, call ${HELPLINES.india.emergency}.`],
  ["Stress and a drink", `Stress can make a drink look like the answer. If you want to cut down, you do not have to do it alone. Recoverly is free, private and in your language: https://recoverly.co.in. For someone to talk to, Tele-MANAS ${HELPLINES.india.teleManas} is free at any hour.`],
  ["No judgement", `Thinking about drinking less, or worried about someone? No judgement here. Free and private support: https://recoverly.co.in. Free helpline, any hour: Tele-MANAS ${HELPLINES.india.teleManas}.`],
  ["Dry-month invitation", `Fancy a drink-free month? Try it and see how you feel. If you drink heavily, speak to a doctor first, because stopping suddenly can be dangerous. Free, private support: https://recoverly.co.in`],
  ["For managers", `Worried about a colleague? You do not need to be an expert. Describe what you have seen, listen, and point to help. A short guide: https://recoverly.co.in/partners/toolkit/manager-guide`]
];

export default function CampaignKitPage() {
  return (
    <ToolkitDoc
      title="Awareness campaign kit: when to speak and what to send"
      intro="Small, kind, regular messages work better than one big warning. Pick a moment from the calendar, send a message, and put up a poster."
    >
      <DocSection title="Calendar of higher-risk moments">
        <DocList items={CALENDAR.map(([when, why]) => `${when}: ${why}`)} />
      </DocSection>

      <DocSection title="Ready-to-send messages">
        <DocPara>{"Copy, then paste into WhatsApp, email or a noticeboard. Add your programme code if you have one. Never name or single out anyone."}</DocPara>
        <div className="space-y-3">
          {MESSAGES.map(([title, text]) => (
            <div key={title} className="space-y-2 rounded-xl border border-border p-3 print:break-inside-avoid">
              <p className="text-sm font-semibold">{title}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">{text}</p>
              <div className="print:hidden">
                <CopyButton text={text} label="Copy message" />
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection title="Tips">
        <DocList
          items={[
            "Send at a calm time of day, and from a person people trust, not from an anonymous account.",
            "Do not make it compulsory and do not ask who has joined: you cannot see that, by design.",
            "Pair each message with a poster: use the poster maker to add your own programme code.",
          ]}
        />
        <p className="text-sm text-body">
          <DocLink href="/partners/toolkit/poster">Poster maker</DocLink>
          {" · "}
          <DocLink href="/partners/toolkit/manager-guide">Manager guide</DocLink>
          {" · "}
          <DocLink href="/partners/toolkit/session-outline">Session outline</DocLink>
        </p>
      </DocSection>
    </ToolkitDoc>
  );
}
