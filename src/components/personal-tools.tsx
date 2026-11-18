"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarClock, PiggyBank, Trophy } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { PlanList } from "@/components/plan-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlans } from "@/hooks/use-plans";
import { milestoneFor } from "@/lib/milestones";
import { type RiskDate, addRiskDate, loadRiskDates, saveRiskDates, upcomingRiskDates } from "@/lib/risk-dates";
import { estimateSaving, loadPrice, parsePrice, savePrice } from "@/lib/savings";

/** A quiet line for a run of alcohol-free days. Shown only when a milestone has been reached; never counts down or warns. */
export function MilestoneNote({ streakDays }: { streakDays: number }) {
  const t = useT();
  const days = milestoneFor(streakDays);
  if (days === null) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
      <Trophy className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {t("dashboard.milestone", { streak: `${streakDays} ${t(streakDays === 1 ? "dashboard.dayUnit" : "dashboard.daysUnit")}` })}
    </p>
  );
}

/** What the person may have saved, from their own logs and a price they type, kept on this device only. */
export function SavingsCard({ userId, monthMl, previousMonthMl }: { userId: string; monthMl: number; previousMonthMl: number }) {
  const t = useT();
  const [price, setPrice] = useState("");
  useEffect(() => {
    const saved = loadPrice(userId);
    setPrice(saved > 0 ? String(saved) : "");
  }, [userId]);
  const saving = estimateSaving(previousMonthMl, monthMl, parsePrice(price));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PiggyBank className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("save.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="save-price">{t("save.price")}</Label>
          <Input
            id="save-price"
            inputMode="decimal"
            value={price}
            maxLength={7}
            className="max-w-[10rem]"
            onChange={(event) => {
              setPrice(event.target.value);
              savePrice(userId, parsePrice(event.target.value));
            }}
          />
        </div>
        {saving && <p className="text-sm leading-relaxed text-body">{t("save.result", { ml: saving.lessMl, amount: saving.amount })}</p>}
      </CardContent>
    </Card>
  );
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

/** Dates the person wants to be ready for. A few days before one, their own plan is shown. Device only. */
export function RiskDatesCard({ userId }: { userId: string }) {
  const t = useT();
  const [plans] = usePlans(userId);
  const [dates, setDates] = useState<RiskDate[]>([]);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => setDates(loadRiskDates(userId)), [userId]);

  const commit = (next: RiskDate[] | null) => {
    if (next && saveRiskDates(userId, next)) setDates(next);
  };
  const soon = upcomingRiskDates(dates, new Date());

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("risk.title")}
        </CardTitle>
        <p className="text-xs leading-relaxed text-subtle">{t("risk.intro")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {soon.length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3" role="status">
            {soon.map((item) => (
              <p key={item.id} className="text-sm font-medium text-body">
                {t("risk.soon", { label: item.label, date: format(parseISO(item.date), "d MMM") })}
              </p>
            ))}
            <PlanList plans={plans} />
          </div>
        )}
        {dates.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {dates.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span>
                  {item.label} <span className="text-subtle">· {format(parseISO(item.date), "d MMM yyyy")}</span>
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => commit(dates.filter((d) => d.id !== item.id))}>
                  {t("risk.remove")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = addRiskDate(dates, { label, date }, newId());
            if (next) {
              commit(next);
              setLabel("");
              setDate("");
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="risk-label">{t("risk.label")}</Label>
            <Input id="risk-label" value={label} maxLength={60} autoComplete="off" onChange={(event) => setLabel(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="risk-date">{t("risk.date")}</Label>
            <Input id="risk-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <Button type="submit" disabled={label.trim() === "" || date === ""}>
            {t("risk.add")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
