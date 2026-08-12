import type { Metadata } from "next";

import { PrivacyContent } from "@/components/privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Recoverly collects, where it is stored, how AI conversations are handled, and how to permanently delete your account and all of your data.",
  alternates: { canonical: "https://recoverly-app.vercel.app/privacy" }
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
