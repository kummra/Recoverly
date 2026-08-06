import type { Metadata } from "next";
import { CloudOff } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HELPLINES } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Offline",
  description: "You're offline. Recoverly will sync again once you reconnect."
};

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudOff className="h-4 w-4 text-muted-foreground" />
            You&apos;re offline
          </CardTitle>
          <CardDescription>
            Recoverly needs a connection to load your records. Everything you&apos;ve logged is safe —
            it&apos;ll be here when you reconnect.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Helplines are phone numbers, not web requests — they still work with no
          data connection, which is exactly when someone might need them most. */}
      <Card className="border-sky-500/40 bg-sky-50 dark:bg-sky-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-sky-800 dark:text-sky-300">
            Need help right now?
          </CardTitle>
          <CardDescription>These work without internet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <p>
            Tele-MANAS{" "}
            <a href={`tel:${HELPLINES.india.teleManas}`} className="font-semibold text-sky-800 underline underline-offset-2 dark:text-sky-300">
              {HELPLINES.india.teleManas}
            </a>
          </p>
          <p>
            KIRAN{" "}
            <a href={`tel:${HELPLINES.india.kiran.replace(/[^\d]/g, "")}`} className="font-semibold text-sky-800 underline underline-offset-2 dark:text-sky-300">
              {HELPLINES.india.kiran}
            </a>
          </p>
          <p>
            Emergency{" "}
            <a href={`tel:${HELPLINES.india.emergency}`} className="font-semibold text-sky-800 underline underline-offset-2 dark:text-sky-300">
              {HELPLINES.india.emergency}
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
