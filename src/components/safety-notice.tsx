"use client";

import { AlertTriangle, LifeBuoy } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { HELPLINES } from "@/lib/safety";
import { cn } from "@/lib/utils";

/**
 * "Not medical advice" + sudden-cessation warning. Shown where users act on
 * their drinking (dashboard) so the medical caveat is visible, not buried.
 */
export function MedicalDisclaimer({ className }: { className?: string }) {
  const t = useT();
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/10 p-3 text-xs leading-relaxed text-muted-foreground",
        className
      )}
    >
      <p className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        {t("safety.notMedicalTitle")}
      </p>
      <p className="mt-1">{t("safety.notMedicalBody")}</p>
    </div>
  );
}

/**
 * Always-visible crisis helpline. Shown on the AI page so help is one glance
 * away during any conversation. Numbers come from the shared safety module so
 * they stay in sync with what the AI route injects.
 */
export function CrisisHelpline({ className }: { className?: string }) {
  const t = useT();
  return (
    <div
      className={cn(
        "rounded-xl border border-sky-500/20 bg-sky-50 dark:bg-sky-950/10 p-3 text-xs leading-relaxed text-muted-foreground",
        className
      )}
    >
      <p className="flex items-center gap-1.5 font-medium text-sky-700 dark:text-sky-300">
        <LifeBuoy className="h-3.5 w-3.5" />
        {t("safety.crisisTitle")}
      </p>
      <p className="mt-1">
        {t("safety.crisisIndia")}: Tele-MANAS {HELPLINES.india.teleManas} · KIRAN {HELPLINES.india.kiran} ·
        {t("safety.emergency")} {HELPLINES.india.emergency}. {t("safety.outsideIndia")}:{" "}
        <a
          href={HELPLINES.internationalDirectoryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-sky-800 dark:hover:text-sky-200"
        >
          findahelpline.com
        </a>
        .
      </p>
    </div>
  );
}
