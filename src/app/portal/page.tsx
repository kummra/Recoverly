import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";

import { PortalContent } from "@/components/portal/portal-content";
import { ProtectedRoute } from "@/components/protected-route";

// A signed-in tool: nothing for search engines.
export const metadata: Metadata = {
  title: "Organisation portal",
  description: "Choose a plan, make programme codes and read your organisation's private reports.",
  robots: { index: false, follow: false }
};

export default function PortalPage() {
  return (
    <div lang="en" className="animate-fade-in-up mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Building2 className="h-4 w-4" aria-hidden />
          <Link href="/partners" className="rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            For organisations
          </Link>
        </p>
        <h1 className="text-3xl font-bold leading-tight">Organisation portal</h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
          For clinics, employers, colleges and NGOs. Recoverly stays free for individuals, always: organisations pay for the toolkit, programme codes and reports that sit beside it. We never show an employer, a college or an insurer anything about an individual.
        </p>
      </header>
      <ProtectedRoute>
        <PortalContent />
      </ProtectedRoute>
    </div>
  );
}
