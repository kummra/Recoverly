"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ClipboardCheck, LifeBuoy, RotateCcw, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

import { ProtectedRoute } from "@/components/protected-route";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import {
  AUDIT_MAX_SCORE,
  AUDIT_QUESTIONS,
  interpretAudit,
  isAuditComplete,
  scoreAudit
} from "@/lib/audit";
import { type AuditRecord, addAuditResult, getAuditResults } from "@/lib/firestore";

export default function AssessmentPage() {
  return (
    <ProtectedRoute>
      <AssessmentContent />
    </ProtectedRoute>
  );
}

function AssessmentContent() {
  const t = useT();
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<AuditRecord[]>([]);

  const score = useMemo(() => scoreAudit(answers), [answers]);
  const complete = isAuditComplete(answers);
  const result = useMemo(() => interpretAudit(score), [score]);
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAuditResults(user.uid)
      .then((r) => !cancelled && setHistory(r))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const submit = async () => {
    if (!user || !complete) return;
    setSaving(true);
    try {
      const stringAnswers = Object.fromEntries(Object.entries(answers).map(([k, v]) => [String(k), v]));
      await addAuditResult(user.uid, { score, zone: result.zone, answers: stringAnswers });
      setHistory((h) => [...h, { id: "local", score, zone: result.zone, createdAt: new Date() }]);
    } catch {
      // Showing the result matters more than storing it.
    } finally {
      setSaving(false);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const restart = () => {
    setAnswers({});
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const zoneStyles: Record<string, string> = {
    low: "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/10",
    hazardous: "border-amber-500/30 bg-amber-50 dark:bg-amber-950/10",
    harmful: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/15",
    "possible-dependence": "border-sky-500/40 bg-sky-50 dark:bg-sky-950/15"
  };

  return (
    <div className="stagger-children mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Alcohol self-check (AUDIT)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ten questions from the World Health Organization&apos;s screening tool. Answering honestly is
          the only way it tells you anything useful — nobody else sees this.
        </p>
      </div>

      <Card className="border-sky-500/30 bg-sky-50 dark:bg-sky-950/10">
        <CardContent className="pt-6">
          <p className="text-sm text-body">
            <span className="font-medium">This is a screening questionnaire, not a diagnosis.</span> It can
            suggest whether your drinking may be putting you at risk, but only a doctor or qualified
            professional can actually assess that.
          </p>
        </CardContent>
      </Card>

      {submitted ? (
        <>
          <Card className={zoneStyles[result.zone]}>
            <CardHeader>
              <CardDescription>Your score</CardDescription>
              <CardTitle className="text-3xl">
                {result.score}
                <span className="ml-1 text-base font-normal text-muted-foreground">/ {AUDIT_MAX_SCORE}</span>
              </CardTitle>
              <p className="text-sm font-medium text-body">{t(result.labelKey)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-body">{t(result.meaningKey)}</p>
              <p className="text-sm leading-relaxed text-body">{t(result.guidanceKey)}</p>
            </CardContent>
          </Card>

          {result.showWithdrawalWarning && (
            <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="h-4 w-4" />
                  Before you change anything, please read
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-body">
                  If you drink heavily or daily, stopping suddenly can be{" "}
                  <span className="font-semibold text-amber-800 dark:text-amber-200">medically dangerous</span> —
                  withdrawal can cause seizures or delirium tremens. Please talk to a doctor before you stop,
                  and only reduce under medical supervision.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-1.5">
              <Link href="/support">
                <LifeBuoy className="h-4 w-4" /> Find support
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-1.5">
              <Link href="/report">Summary for my doctor</Link>
            </Button>
            <Button type="button" variant="outline" className="gap-1.5" onClick={restart}>
              <RotateCcw className="h-4 w-4" /> Take it again
            </Button>
          </div>

          {history.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Your previous results</CardTitle>
                <CardDescription>Scores can move as your drinking changes.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {[...history].reverse().slice(0, 6).map((h, i) => (
                    <li key={`${h.id}-${i}`} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{format(h.createdAt, "d MMM yyyy")}</span>
                      <span className="font-medium tabular-nums">{h.score} / {AUDIT_MAX_SCORE}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          {AUDIT_QUESTIONS.map((q) => (
            <Card key={q.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium leading-snug">
                  {q.id}. {q.text}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" role="radiogroup" aria-label={q.text}>
                  {q.options.map((opt, idx) => {
                    const selected = answers[q.id] === idx;
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                          selected
                            ? "border-emerald-500 bg-emerald-500/10 font-medium text-foreground"
                            : "border-border text-body hover:bg-surface"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="sticky bottom-4 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {answeredCount} of {AUDIT_QUESTIONS.length} answered
              </p>
              <Button type="button" onClick={submit} disabled={!complete || saving}>
                {saving ? "Saving…" : "See my result"}
              </Button>
            </div>
            {!complete && answeredCount > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
                <AlertCircle className="h-3.5 w-3.5" /> Answer every question for an accurate score.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
