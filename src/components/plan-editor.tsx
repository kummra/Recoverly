"use client";

import { useRef, useState } from "react";
import { AlertCircle, ListChecks, Trash2 } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { PlanItem } from "@/components/plan-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlans } from "@/hooks/use-plans";
import { MAX_PLANS, MAX_PLAN_TEXT, addPlan, removePlan, updatePlans } from "@/lib/plans";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Where plans are made and removed. Plans are stored on this device only, which
 * the introduction says in plain words; a plan that quietly failed to save would
 * be worse than none, so a refused write is reported rather than swallowed.
 *
 * Every change is applied to what is in storage at that moment (`updatePlans`),
 * not to the list read when the page loaded, so a second open tab cannot be
 * overwritten by a stale copy.
 *
 * Saving or removing a plan changes what is on screen under the person's
 * fingers, so the result is announced and keyboard focus is put somewhere
 * sensible instead of being left on a button that has just disappeared.
 */
export function PlanEditor({ userId }: { userId: string }) {
  const t = useT();
  const [plans, setPlans] = usePlans(userId);
  const [when, setWhen] = useState("");
  const [then, setThen] = useState("");
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<"saved" | "removed" | null>(null);
  const whenRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const full = plans.length >= MAX_PLANS;
  const ready = when.trim() !== "" && then.trim() !== "";

  const afterChange = (result: { ok: boolean; plans: typeof plans }, announce: "saved" | "removed") => {
    setPlans(result.plans);
    setFailed(!result.ok);
    setStatus(result.ok ? announce : null);
    // After the paint, so the form is there (or gone) before focus is placed.
    requestAnimationFrame(() => {
      const target = result.plans.length >= MAX_PLANS ? headingRef.current : whenRef.current;
      (announce === "removed" ? headingRef.current : target)?.focus();
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    let added = false;
    const result = updatePlans(userId, (current) => {
      const next = addPlan(current, { when, then }, newId());
      added = next !== null;
      return next;
    });
    if (added && result.ok) {
      setWhen("");
      setThen("");
    }
    if (added || !result.ok) afterChange(result, "saved");
    else setPlans(result.plans); // nothing added (e.g. another tab filled the list): just show what is stored
  };

  const remove = (id: string) => afterChange(updatePlans(userId, (current) => removePlan(current, id)), "removed");

  return (
    <Card id="plans">
      <CardHeader>
        <CardTitle ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-base outline-none">
          <ListChecks className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          {t("plan.title")}
        </CardTitle>
        <CardDescription>{t("plan.intro")}</CardDescription>
        <p className="pt-1 text-xs leading-relaxed text-subtle">{t("plan.safety")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {plans.length > 0 && (
          <ul className="space-y-2">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-start gap-2 rounded-xl border border-border bg-surface-muted p-3"
              >
                <div className="min-w-0 flex-1">
                  <PlanItem plan={plan} />
                </div>
                <button
                  type="button"
                  onClick={() => remove(plan.id)}
                  aria-label={`${t("plan.remove")}: ${plan.when}`}
                  className="rounded-lg p-2 text-subtle transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {full ? (
          <p className="text-sm text-muted-foreground">{t("plan.limit", { max: MAX_PLANS })}</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-when">{t("plan.whenLabel")}</Label>
              <Input
                ref={whenRef}
                id="plan-when"
                value={when}
                onChange={(e) => {
                  setWhen(e.target.value);
                  setStatus(null);
                }}
                maxLength={MAX_PLAN_TEXT}
                placeholder={t("plan.whenPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-then">{t("plan.thenLabel")}</Label>
              <Input
                id="plan-then"
                value={then}
                onChange={(e) => {
                  setThen(e.target.value);
                  setStatus(null);
                }}
                maxLength={MAX_PLAN_TEXT}
                placeholder={t("plan.thenPlaceholder")}
              />
            </div>
            <Button type="submit" disabled={!ready} className="w-full sm:w-auto">
              {t("plan.add")}
            </Button>
          </form>
        )}

        {/* Always mounted, so a screen reader reliably announces what changed. */}
        <p role="status" className="min-h-[1rem] text-xs text-emerald-700 dark:text-emerald-400">
          {status === "saved" ? t("plan.saved") : status === "removed" ? t("plan.removed") : ""}
        </p>

        {failed && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t("plan.saveFailed")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
