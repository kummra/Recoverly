import type { Metadata } from "next";

import { alternatesFor } from "@/lib/seo/alternates";

import { TermsContent } from "@/components/terms-content";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "How to use Recoverly safely: it offers habit support and reflection, never medical diagnosis, treatment, or emergency care.",
  alternates: alternatesFor("en", "terms"),
};

export default function TermsPage() {
  return <TermsContent locale="en" />;
}
