import { AlertTriangle, LifeBuoy } from "lucide-react";

import { HELPLINES } from "@/lib/safety";
import { cn } from "@/lib/utils";

/**
 * "Not medical advice" + sudden-cessation warning. Shown where users act on
 * their drinking (dashboard) so the medical caveat is visible, not buried.
 */
export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/10 p-3 text-xs leading-relaxed text-muted-foreground",
        className
      )}
    >
      <p className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        Support, not medical advice
      </p>
      <p className="mt-1">
        Recoverly helps you reflect on your habits — it is not medical care. If you drink
        heavily, stopping suddenly can be dangerous (withdrawal can cause seizures). Please
        talk to a doctor before making big changes to how much you drink.
      </p>
    </div>
  );
}

/**
 * Always-visible crisis helpline. Shown on the AI page so help is one glance
 * away during any conversation. Numbers come from the shared safety module so
 * they stay in sync with what the AI route injects.
 */
export function CrisisHelpline({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-sky-500/20 bg-sky-50 dark:bg-sky-950/10 p-3 text-xs leading-relaxed text-muted-foreground",
        className
      )}
    >
      <p className="flex items-center gap-1.5 font-medium text-sky-700 dark:text-sky-300">
        <LifeBuoy className="h-3.5 w-3.5" />
        In crisis or thinking about self-harm? Help is available now
      </p>
      <p className="mt-1">
        India: Tele-MANAS {HELPLINES.india.teleManas} · KIRAN {HELPLINES.india.kiran} ·
        Emergency {HELPLINES.india.emergency}. Outside India:{" "}
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
