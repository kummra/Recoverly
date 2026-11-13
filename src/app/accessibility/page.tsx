import type { Metadata } from "next";

import { DocList, DocPara, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Accessibility statement",
  description: "What Recoverly does for accessibility, what has not been tested, and how to tell us about a problem.",
  alternates: { canonical: "https://recoverly.co.in/accessibility" }
};

export default function AccessibilityPage() {
  return (
    <ToolkitDoc
      kicker="Recoverly accessibility"
      title="Accessibility statement"
      intro="We want Recoverly to work for people with different abilities, devices and languages. This is what we have done and what we have not yet checked."
      back={{ href: "/", label: "Back to Recoverly" }}
      footerNote="This is a statement of our own checks. Recoverly has not had a formal external accessibility audit."
    >
      <DocSection title="What we do">
        <DocList
          items={[
            "The app and its guides are available in nine languages: English, Hindi, Marathi, Punjabi, Tamil, Telugu, Kannada, Malayalam and Gujarati.",
            "Light and dark themes, and text that scales with the browser's font size.",
            "Controls are real buttons, links and form fields with labels, so they work with a keyboard and with screen readers, and keyboard focus is visible.",
            "Touch targets are sized for thumbs, and layouts are checked at phone width.",
            "Important messages such as errors and confirmations are announced to screen readers.",
            "Read-aloud is available for guides, and a clear way to reach helplines is on every page.",
          ]}
        />
      </DocSection>
      <DocSection title="What we have not done yet">
        <DocList
          items={[
            "No formal audit against WCAG, and no testing with a panel of disabled users.",
            "Screen-reader behaviour has been checked only lightly, and not in every language.",
            "Some organisation pages (posters, the toolkit) are English only.",
          ]}
        />
      </DocSection>
      <DocSection title="Tell us about a problem">
        <DocPara>
          {"If something does not work for you, email "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          {" with the page, your device and what happened. We will try to fix it."}
        </DocPara>
      </DocSection>
    </ToolkitDoc>
  );
}
