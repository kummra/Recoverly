"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Printer } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { useT } from "@/components/i18n-provider";
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
  const t = useT();
  // Streaks read as "3 days" / "1 day"; the unit keys already exist for the dashboard.
  const days = (n: number) =>
    `${n} ${t(n === 1 ? "dashboard.dayUnit" : "dashboard.daysUnit")}`;
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

  if (loading) return <p className="text-sm text-muted-foreground">{t("report.preparing")}</p>;

  const rows: Array<[string, string]> = [
    [t("report.recordsSince"), records.length ? format(records[0].createdAt, "d MMM yyyy") : "—"],
    [t("report.totalLogged"), String(records.length)],
    [t("report.thisMonth"), `${summary.currentMonthTotal} ml`],
    [t("report.previousMonth"), `${summary.previousMonthTotal} ml`],
    [t("report.dailyAverage"), `${summary.dailyAverage} ml`],
    [t("report.currentStreak"), days(progress.currentStreakDays)],
    [t("report.longestStreak"), days(progress.longestStreakDays)],
    [
      t("report.freeDaysThisMonth"),
      t("report.ofTotal", {
        n: progress.alcoholFreeDaysThisMonth,
        total: progress.daysElapsedThisMonth
      })
    ],
    [t("report.weeklyGoal"), profile?.goalWeeklyMl ? `${profile.goalWeeklyMl} ml` : t("report.notSet")]
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-bold">{t("report.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("report.subtitle")}</p>
        </div>
        <Button type="button" onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-4 w-4" /> {t("report.print")}
        </Button>
      </div>

      <article className="space-y-6 rounded-2xl border border-border bg-card p-6 print:border-0 print:p-0">
        <header className="border-b border-border pb-4">
          <h1 className="text-lg font-semibold">{t("report.docTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.displayName ? `${profile.displayName} · ` : ""}
            {user?.email ?? ""}
          </p>
          <p className="text-sm text-muted-foreground">{t("report.generated", { date: format(new Date(), "d MMM yyyy") })}</p>
        </header>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("report.consumption")}
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
              {t("report.auditHeading")}
            </h2>
            <p className="text-sm text-body">
              {t("report.auditLine", {
                score: latestAudit.score,
                max: AUDIT_MAX_SCORE,
                label: t(interpretAudit(latestAudit.score).labelKey),
                date: format(latestAudit.createdAt, "d MMM yyyy"),
                extra: audits.length > 1 ? t("report.auditExtra", { n: audits.length }) : ""
              })}
            </p>
            <p className="mt-1 text-xs text-subtle">{t("report.auditNote")}</p>
          </section>
        )}

        {cravings.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("report.cravingsHeading")}
            </h2>
            <p className="text-sm text-body">
              {t("report.cravingsLine", {
                total: cravings.length,
                passed: cravings.filter((c) => c.outcome === "passed").length,
                avg: (cravings.reduce((s, c) => s + c.intensity, 0) / cravings.length).toFixed(1)
              })}
            </p>
          </section>
        )}

        {triggers.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("report.patternsHeading")}
            </h2>
            <ul className="list-inside list-disc text-sm text-body">
              {triggers.map((insight) => (
                <li key={insight.labelKey}>
                  {t("report.clusterLine", {
                    pattern: t(insight.labelKey, insight.mood ? { mood: insight.mood } : undefined),
                    percent: Math.round(insight.share * 100)
                  })}
                </li>
              ))}
            </ul>
          </section>
        )}

        {profile?.motivation && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("report.motivationHeading")}
            </h2>
            <p className="text-sm italic text-body">&ldquo;{profile.motivation}&rdquo;</p>
          </section>
        )}

        <footer className="border-t border-border pt-4 text-xs leading-relaxed text-subtle">
          {t("report.disclaimer")}
        </footer>
      </article>
    </div>
  );
}
