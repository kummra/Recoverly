"use client";

import { useId } from "react";

import { useT } from "@/components/i18n-provider";
import { type Programme, isSample } from "@/lib/programme";

/**
 * The privacy sentence for a programme. A programme that offers the anonymous
 * monthly headcount says so (and what the organisation can and cannot see); one
 * that does not keeps the original, stronger promise that it sees nothing at all.
 */
export function useProgrammePrivacy() {
  const t = useT();
  return (programme: Programme) => t(programme.headcount ? "programme.privateCounted" : "programme.private", { name: programme.name });
}

/**
 * "Count me in the monthly total": the choice, off unless the person ticks it, with
 * what it means written out beside it, at the moment of joining and again in
 * Settings. Shown only for a programme whose organisation receives the headcount;
 * for any other it renders nothing, because nothing about it is ever counted.
 * See `lib/programme-count.ts` for what is and is not sent.
 */
export function HeadcountChoice({ programme, checked, onChange }: { programme: Programme; checked: boolean; onChange: (checked: boolean) => void }) {
  const t = useT();
  const helpId = useId();
  if (!programme.headcount) return null;
  return (
    <div className="space-y-1.5 rounded-xl border border-border bg-surface-muted/50 p-3">
      <label className="flex min-h-9 items-start gap-2.5 py-1 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          checked={checked}
          aria-describedby={helpId}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
        />
        {t("programme.countLabel", { name: programme.name })}
      </label>
      <p id={helpId} className="-mt-1 pl-[1.625rem] text-xs leading-relaxed text-subtle">
        {t("programme.countHelp", { name: programme.name })}
      </p>
      {isSample(programme) && <p className="pl-[1.625rem] text-xs leading-relaxed text-subtle">{t("programme.countSample")}</p>}
    </div>
  );
}
