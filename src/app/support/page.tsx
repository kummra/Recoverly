import type { Metadata } from "next";

import { alternatesFor } from "@/lib/seo/alternates";

import { SupportContent } from "@/components/support-content";

export const metadata: Metadata = {
  // The page's heading stays "Support & Helplines". The title is what someone
  // types into a search box when they need this page, so it carries the number.
  // 14416 and 112 are the ones the page itself prints and `lib/safety.ts` holds.
  title: "Alcohol helplines in India: Tele-MANAS 14416",
  alternates: alternatesFor("en", "support"),
  description:
    "Free help for alcohol problems in India: Tele-MANAS 14416 (24 hours), emergency 112, withdrawal-safety guidance, and how to find a doctor or de-addiction centre."
};

export default function SupportPage() {
  return <SupportContent locale="en" />;
}
