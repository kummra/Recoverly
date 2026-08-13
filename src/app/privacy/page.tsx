import type { Metadata } from "next";

import { alternatesFor } from "@/lib/seo/alternates";

import { PrivacyContent } from "@/components/privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Recoverly collects, where it is stored, how AI conversations are handled, and how to permanently delete your account and all of your data.",
  alternates: alternatesFor("en", "privacy"),
};

export default function PrivacyPage() {
  return <PrivacyContent locale="en" />;
}
