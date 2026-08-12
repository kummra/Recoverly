import type { Metadata } from "next";

import { FaqContent } from "@/components/faq-content";
import { FaqStructuredData } from "@/components/structured-data";

export const metadata: Metadata = {
  title: "FAQ",
  alternates: { canonical: "https://recoverly-app.vercel.app/faq" },
  description:
    "Answers to common questions about Recoverly — how it works, your privacy, the AI coach, and how we keep you safe while you reduce or quit alcohol."
};

export default function FaqPage() {
  return (
    <>
      <FaqStructuredData />
      <FaqContent />
    </>
  );
}
