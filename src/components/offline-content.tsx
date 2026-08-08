"use client";

import { CloudOff } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HELPLINES } from "@/lib/safety";

export function OfflineContent() {
  const t = useT();

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudOff className="h-4 w-4 text-muted-foreground" />
            {t("offline.title")}
          </CardTitle>
          <CardDescription>{t("offline.body")}</CardDescription>
        </CardHeader>
      </Card>

      {/* Helplines are phone numbers, not web requests — they still work with no
          data connection, which is exactly when someone might need them most. */}
      <Card className="border-sky-500/40 bg-sky-50 dark:bg-sky-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-sky-800 dark:text-sky-300">
            {t("offline.needHelp")}
          </CardTitle>
          <CardDescription>{t("offline.worksOffline")}</CardDescription>
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
            {t("common.emergency")}{" "}
            <a href={`tel:${HELPLINES.india.emergency}`} className="font-semibold text-sky-800 underline underline-offset-2 dark:text-sky-300">
              {HELPLINES.india.emergency}
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
