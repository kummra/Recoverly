import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone } from "lucide-react";

import { FieldContent } from "@/components/field-content";

const TITLE = "Using Recoverly on a shared phone";
const DESCRIPTION = "For field workers, camp volunteers and NGO staff who help several people on one phone: clear it between people, pick their language, read the safety message aloud.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://recoverly.co.in/field" },
  openGraph: { title: `${TITLE} · Recoverly`, description: DESCRIPTION, url: "https://recoverly.co.in/field", siteName: "Recoverly", locale: "en_IN", type: "website" }
};

/**
 * Free and open to everyone, like the safety documents: it exists to help people reach help, so it is not behind a plan.
 * It stores nothing about anyone and sends nothing anywhere; the one thing it does is clear this phone.
 */
export default function FieldPage() {
  return (
    <div lang="en" className="animate-fade-in-up mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Smartphone className="h-4 w-4" aria-hidden />
          <Link href="/partners" className="rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            For organisations and field workers
          </Link>
        </p>
        <h1 className="text-3xl font-bold leading-tight">{TITLE}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Many people share one phone. This page is for the person who helps them: a health worker, a camp volunteer, an NGO field officer. It keeps nothing about anyone, and its one job is to leave the phone clean for the next person.
        </p>
      </header>
      <FieldContent />
    </div>
  );
}
