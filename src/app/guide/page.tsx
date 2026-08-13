import type { Metadata } from "next";

import { alternatesFor } from "@/lib/seo/alternates";

import { GuideContent } from "@/components/guide-content";
import { GuideStructuredData } from "@/components/structured-data";

export const metadata: Metadata = {
  title: "How it works",
  alternates: alternatesFor("en", "guide"),
  description:
    "A simple, step-by-step guide to getting started with Recoverly — set a goal, log honestly, see your progress, and get support when you need it."
};

export default function GuidePage() {
  return (
    <>
      <GuideStructuredData locale="en" />
      <GuideContent locale="en" />
    </>
  );
}
