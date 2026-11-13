"use client";

import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";

import { PlanItem } from "@/components/plan-list";
import { useI18n } from "@/components/i18n-provider";
import { interpretAudit } from "@/lib/audit";
import type { ShareSnapshot } from "@/lib/share";

const day = (iso: string) => format(parseISO(iso), "d MMM yyyy");

/**
 * A summary, read-only, as the page a link opens and the team's workspace both show it.
 *
 * Everything shown has been through `sanitiseSnapshot` before it gets here, and is rendered as plain
 * text, so a summary made by someone else cannot add anything to the page. The headings and wording
 * are the report's own, in the reader's language. `meta` is the line under the name: what it is and
 * until when it can be read, which differs between a link and a workspace copy.
 */
export function SnapshotArticle({ snapshot, meta }: { snapshot: ShareSnapshot; meta: ReactNode }) {
  const { t } = useI18n();
  const { progress, audit, cravings, patterns } = snapshot;
  const days = (n: number) => `${n} ${t(n === 1 ? "dashboard.dayUnit" : "dashboard.daysUnit")}`;

  const rows: Array<[string, string]> = progress
    ? [
        [t("report.recordsSince"), progress.since ? day(progress.since) : "—"],
        [t("report.totalLogged"), String(progress.checkIns)],
        [t("report.thisMonth"), `${progress.monthMl} ml`],
        [t("report.previousMonth"), `${progress.previousMonthMl} ml`],
        [t("report.dailyAverage"), `${progress.dailyAverageMl} ml`],
        [t("report.currentStreak"), days(progress.currentStreakDays)],
        [t("report.longestStreak"), days(progress.longestStreakDays)],
        [t("report.freeDaysThisMonth"), t("report.ofTotal", { n: progress.freeDaysThisMonth, total: progress.daysThisMonth })],
        [t("report.weeklyGoal"), progress.weeklyGoalMl ? `${progress.weeklyGoalMl} ml` : t("report.notSet")]
      ]
    : [];

  const heading = "mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <article className="space-y-6 rounded-2xl border border-border bg-card p-6 print:border-0 print:p-0">
      <header className="border-b border-border pb-4">
        <h1 className="text-lg font-semibold">{t("shareView.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{snapshot.label ? t("shareView.by", { name: snapshot.label }) : t("shareView.byAnon")}</p>
        <p className="text-sm text-muted-foreground">{meta}</p>
      </header>

      {progress && (
        <section>
          <h2 className={heading}>{t("report.consumption")}</h2>
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
      )}

      {audit && (
        <section>
          <h2 className={heading}>{t("report.auditHeading")}</h2>
          <p className="text-sm text-body">
            {t("report.auditLine", {
              score: audit.score,
              max: audit.max,
              label: t(interpretAudit(audit.score).labelKey),
              date: day(audit.date),
              extra: audit.assessments > 1 ? t("report.auditExtra", { n: audit.assessments }) : ""
            })}
          </p>
          <p className="mt-1 text-xs text-subtle">{t("report.auditNote")}</p>
        </section>
      )}

      {cravings && cravings.total > 0 && (
        <section>
          <h2 className={heading}>{t("report.cravingsHeading")}</h2>
          <p className="text-sm text-body">{t("report.cravingsLine", { total: cravings.total, passed: cravings.passed, avg: cravings.avgIntensity.toFixed(1) })}</p>
        </section>
      )}

      {patterns && (
        <section>
          <h2 className={heading}>{t("report.patternsHeading")}</h2>
          <ul className="list-inside list-disc text-sm text-body">
            {patterns.map((pattern) => (
              <li key={`${pattern.key}|${pattern.mood ?? ""}`}>
                {t("report.clusterLine", { pattern: t(pattern.key, pattern.mood ? { mood: pattern.mood } : undefined), percent: pattern.percent })}
              </li>
            ))}
          </ul>
        </section>
      )}

      {snapshot.why && (
        <section>
          <h2 className={heading}>{t("report.motivationHeading")}</h2>
          <p className="break-words text-sm italic text-body">&ldquo;{snapshot.why}&rdquo;</p>
        </section>
      )}

      {snapshot.note && (
        <section>
          <h2 className={heading}>{t("report.notesLabel")}</h2>
          <p className="whitespace-pre-wrap break-words text-sm text-body">{snapshot.note}</p>
        </section>
      )}

      {snapshot.plans && (
        <section>
          <h2 className={heading}>{t("report.plansHeading")}</h2>
          <ul className="space-y-3">
            {snapshot.plans.map((plan, index) => (
              <li key={index}>
                <PlanItem plan={{ id: String(index), when: plan.when, then: plan.then }} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-border pt-4 text-xs leading-relaxed text-subtle">{t("report.disclaimer")}</footer>
    </article>
  );
}
