import type { Metadata } from "next";

import { SupportContent } from "@/components/support-content";

export const metadata: Metadata = {
  title: "Support & Helplines",
  alternates: { canonical: "https://recoverly-app.vercel.app/support" },
  description:
    "If you need help right now, you are not alone. Crisis helplines, withdrawal-safety guidance, and how to find professional support for alcohol recovery."
};

export default function SupportPage() {
  return <SupportContent />;
}
