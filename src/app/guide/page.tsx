import type { Metadata } from "next";

import { GuideContent } from "@/components/guide-content";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "A simple, step-by-step guide to getting started with Recoverly — set a goal, log honestly, see your progress, and get support when you need it."
};

export default function GuidePage() {
  return <GuideContent />;
}
