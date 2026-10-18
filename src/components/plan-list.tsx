"use client";

import { useId } from "react";
import { ListChecks } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import type { Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";

/** One plan: the situation, then what they will do. The text is theirs, shown
 *  as plain text and never as markup. */
export function PlanItem({ plan }: { plan: Plan }) {
  const t = useT();
  return (
    <dl className="space-y-0.5 text-sm">
      <dt className="text-xs text-subtle">{t("plan.whenLabel")}</dt>
      <dd className="break-words text-body">{plan.when}</dd>
      <dt className="pt-1 text-xs text-subtle">{t("plan.thenLabel")}</dt>
      <dd className="break-words font-medium text-foreground">{plan.then}</dd>
    </dl>
  );
}

/**
 * The person's own plans, read back to them. Used where a plan has to be
 * found without looking for it: the nudge before a hard stretch and the
 * craving screen.
 */
export function PlanList({ plans, className }: { plans: Plan[]; className?: string }) {
  const t = useT();
  const headingId = useId();
  if (plans.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      className={cn("rounded-xl border border-sky-500/25 bg-sky-500/5 px-3 py-2.5 text-left", className)}
    >
      <h3 id={headingId} className="flex items-center gap-1.5 text-sm font-semibold text-sky-800 dark:text-sky-200">
        <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
        {t("plan.yourPlan")}
      </h3>
      <ul className="mt-2 space-y-2.5">
        {plans.map((plan) => (
          <li key={plan.id}>
            <PlanItem plan={plan} />
          </li>
        ))}
      </ul>
    </section>
  );
}
