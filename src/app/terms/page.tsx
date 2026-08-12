import type { Metadata } from "next";

import { TermsContent } from "@/components/terms-content";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "How to use Recoverly safely: it offers habit support and reflection, never medical diagnosis, treatment, or emergency care.",
  alternates: { canonical: "https://recoverly-app.vercel.app/terms" }
};

export default function TermsPage() {
  return <TermsContent />;
}
