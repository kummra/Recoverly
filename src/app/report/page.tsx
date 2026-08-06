"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Printer } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  buildAnalytics,
  buildProgress,
  buildTriggerInsights
} from "@/lib/analytics";
import { AUDIT_MAX_SCORE, interpretAudit } from "@/lib/audit";
import {
  type AuditRecord,
  type CravingEvent,
  type DrinkRecord,
  type UserProfile,
  getAuditResults,
  getCravingEvents,
  getDrinkRecords,
  getUserProfile
} from "@/lib/firestore";

/**
 * A one-page summary to take to a doctor or counsellor.
 *
 * Printed via the browser (no PDF dependency): "Save as PDF" in the print
 * dialog produces the file. Print styles hide the app chrome so the sheet
 * contains only the clinical summary.
 *
 * This reports what the user logged. It draws no clinical conclusions — that is
 * the clinician's job, and the footer says so.
 */
export default function ReportPage() {
  return (
    <ProtectedRoute>
      <ReportContent />
    </ProtectedRoute>
  );
}

function ReportContent() {
  const { user } = useAuth();
  const [records, setRecords] = useState<DrinkRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [cravings, setCravings] = useState<CravingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      getDrinkRecords(user.uid),
      getUserProfile(user.uid),
      getAuditResults(user.uid).catch(() => [] as AuditRecord[]),
      getCravingEvents(user.uid).catch(() => [] as CravingEvent[])
    ])
      .then(([r, p, a, c]) => {
        if (cancelled) return;
        setRecords(r);
        setProfile(p);
        setAudits(a);
        setCravings(c);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const summary = useMemo(() => buildAnalytics(records), [records]);
  const progress = useMemo(() => buildProgress(records), [records]);
  const triggers = useMemo(() => buildTriggerInsights(records), [records]);
  const latestAudit = audits.length ? audits[audits.length - 1] : null;

  if (loading) return <p className="text-sm text-muted-foreground">Preparing your summary…</p>;

  const rows: Array<[string, string]> = [
    ["Records kept since", records.length ? format(records[0].createdAt, "d MMM yyyy") : "—"],
    ["Total check-ins logged", String(records.length)],
    ["This month", `${summary.currentMonthTotal} ml`],
    ["Previous month", `${summary.previousMonthTotal} ml`],
    ["Daily average (this month)", `${summary.dailyAverage} ml`],
    ["Current alcohol-free streak", `${progress.currentStreakDays} day${progress.currentStreakDays === 1 ? "" : "s"}`],
    ["Longest alcohol-free streak", `${progress.longestStreakDays} day${progress.longestStreakDays === 1 ? "" : "s"}`],
    ["Alcohol-free days this month", `${progress.alcoholFreeDaysThisMonth} of ${progress.daysElapsedThisMonth}`],
    ["Weekly goal set", profile?.goalWeeklyMl ? `${profile.goalWeeklyMl} ml` : "not set"]
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-bold">Summary for your clinician</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A one-page overview to bring to an appointment. Use Print, then choose &ldquo;Save as
            PDF&rdquo; if you&apos;d rather send it.
          </p>
        </div>
        <Button type="button" onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <article className="space-y-6 rounded-2xl border border-border bg-card p-6 print:border-0 print:p-0">
        <header className="border-b border-border pb-4">
          <h1 className="text-lg font-semibold">Recoverly — self-reported summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.displayName ? `${profile.displayName} · ` : ""}
            {user?.email ?? ""}
          </p>
          <p className="text-sm text-muted-foreground">Generated {format(new Date(), "d MMM yyyy")}</p>
        </header>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Consumption
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label} className="border-b border-border/60 last:border-0">
                  <td className="py-1.5 pr-4 text-body">{label}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {latestAudit && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              AUDIT screening
            </h2>
            <p className="text-sm text-body">
              Most recent score <span className="font-semibold">{latestAudit.score} / {AUDIT_MAX_SCORE}</span>{" "}
              ({interpretAudit(latestAudit.score).label}) on {format(latestAudit.createdAt, "d MMM yyyy")}.
              {audits.length > 1 ? ` ${audits.length} assessments recorded.` : ""}
            </p>
            <p className="mt-1 text-xs text-subtle">
              Self-administered WHO AUDIT screening questionnaire. Screening only — not a diagnosis.
            </p>
          </section>
        )}

        {cravings.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Cravings
            </h2>
            <p className="text-sm text-body">
              {cravings.length} craving episode{cravings.length === 1 ? "" : "s"} logged.{" "}
              {cravings.filter((c) => c.outcome === "passed").length} passed without drinking.
              Average self-rated intensity{" "}
              {(cravings.reduce((s, c) => s + c.intensity, 0) / cravings.length).toFixed(1)} of 5.
            </p>
          </section>
        )}

        {triggers.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Self-reported patterns
            </h2>
            <ul className="list-inside list-disc text-sm text-body">
              {triggers.map((t) => (
                <li key={t.label}>
                  Drinking clusters around {t.label} ({Math.round(t.share * 100)}% of logs)
                </li>
              ))}
            </ul>
          </section>
        )}

        {profile?.motivation && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Stated motivation
            </h2>
            <p className="text-sm italic text-body">&ldquo;{profile.motivation}&rdquo;</p>
          </section>
        )}

        <footer className="border-t border-border pt-4 text-xs leading-relaxed text-subtle">
          All figures are self-reported by the user through the Recoverly app and are not clinically
          verified. Recoverly is a self-management and support tool; it does not diagnose, treat or
          provide medical advice. This summary is intended to support — not replace — clinical
          assessment.
        </footer>
      </article>
    </div>
  );
}
