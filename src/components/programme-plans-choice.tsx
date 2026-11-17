"use client";

import { useId } from "react";

import { useT } from "@/components/i18n-provider";
import type { Programme } from "@/lib/programme";

/**
 * "Add {name}'s suggested plans to my plans": shown only for a programme that offers ready-made plans, off
 * unless ticked, with the plans written out so the person sees exactly what they would be adding. They are
 * copied into the person's own plans on this device only (`lib/programme-plans.ts`); the organisation is not told.
 */
export function ProgrammePlansChoice({ programme, checked, onChange }: { programme: Programme; checked: boolean; onChange: (checked: boolean) => void }) {
  const t = useT();
  const helpId = useId();
  if (!programme.plans?.length) return null;
  return (
    <div className="space-y-1.5 rounded-xl border border-border bg-surface-muted/50 p-3">
      <label className="flex min-h-9 items-start gap-2.5 py-1 text-sm font-medium text-foreground">
        <input type="checkbox" checked={checked} aria-describedby={helpId} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
        {t("programme.plansLabel", { name: programme.name })}
      </label>
      <p id={helpId} className="-mt-1 pl-[1.625rem] text-xs leading-relaxed text-subtle">
        {t("programme.plansHelp", { name: programme.name })}
      </p>
      <ul className="space-y-1 pl-[1.625rem] text-sm text-body">
        {programme.plans.map((plan, index) => (
          <li key={index}>
            <span className="font-medium">{plan.when}</span> {"\u2192"} {plan.then}
          </li>
        ))}
      </ul>
    </div>
  );
}
