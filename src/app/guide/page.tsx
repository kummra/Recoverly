import type { Metadata } from "next";

import { GuideContent } from "@/components/guide-content";
import { GuideStructuredData } from "@/components/structured-data";

export const metadata: Metadata = {
  title: "How it works",
  alternates: { canonical: "https://recoverly-app.vercel.app/guide" },
  description:
    "A simple, step-by-step guide to getting started with Recoverly — set a goal, log honestly, see your progress, and get support when you need it."
};

export default function GuidePage() {
  return (
    <>
      <GuideStructuredData />
      <GuideContent />
    </>
  );
}
