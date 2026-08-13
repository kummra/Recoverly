import type { Metadata } from "next";

import { alternatesFor } from "@/lib/seo/alternates";

import { FaqContent } from "@/components/faq-content";
import { FaqStructuredData } from "@/components/structured-data";

export const metadata: Metadata = {
  title: "FAQ",
  alternates: alternatesFor("en", "faq"),
  description:
    "Answers to common questions about Recoverly — how it works, your privacy, the AI coach, and how we keep you safe while you reduce or quit alcohol."
};

export default function FaqPage() {
  return (
    <>
      <FaqStructuredData locale="en" />
      <FaqContent locale="en" />
    </>
  );
}
