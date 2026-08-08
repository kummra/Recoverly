"use client";

import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Heart, Sparkles, Target } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { WithdrawalWarning } from "@/components/safety-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveUserPreferences } from "@/lib/firestore";
import { MAX_WEEKLY_GOAL_ML, goalSchema } from "@/lib/schemas";

/**
 * Gentle first-run flow for brand-new users: capture their "why" (identity
 * anchor) and a realistic weekly goal, instead of dropping them into an empty
 * dashboard. Writes the profile, then hands back to the dashboard.
 */
export function Onboarding({
  userId,
  onComplete,
  onSkip
}: {
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const t = useT();
  const [step, setStep] = useState<1 | 2>(1);
  // Tracks the explicit "I want to stop entirely" choice. We can't infer this
  // from the goal value: 0 is stored as "no goal" everywhere else in the app,
  // so someone typing 0 to mean "no limit" must not get a withdrawal warning.
  const [aimingToStop, setAimingToStop] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [goalWeeklyMl, setGoalWeeklyMl] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    const goal = goalWeeklyMl === "" ? 0 : Number(goalWeeklyMl);
    const parsed = goalSchema.safeParse({
      goalWeeklyMl: goal,
      // Record the intent, not just the number: 0 alone reads as "no goal".
      goalType: aimingToStop ? "quit" : "reduce",
      motivation: motivation.trim() || undefined
    });
    if (!parsed.success) {
      setError(`Please enter a goal between 0 and ${MAX_WEEKLY_GOAL_ML} ml.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveUserPreferences(userId, parsed.data);
      onComplete();
    } catch {
      setError(t("onboarding.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-50 dark:from-emerald-950/30 via-card to-card">
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
      <CardContent className="relative space-y-5 pt-6">
        {step === 1 ? (
          <>
            <div className="flex items-center gap-3">
              <Sparkles className="h-7 w-7 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-lg font-semibold">{t("onboarding.welcome")}</h3>
                <p className="text-sm text-muted-foreground">{t("onboarding.welcomeBody")}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="why" className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {t("onboarding.whyLabel")}
              </Label>
              <textarea
                id="why"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value.slice(0, 200))}
                rows={3}
                placeholder={t("settings.yourWhyPlaceholder")}
                className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-emerald-500/50 focus:outline-none"
              />
              <p className="text-xs text-subtle">
                {t("onboarding.whyHint")}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
                {t("onboarding.skip")}
              </Button>
              <Button type="button" onClick={() => setStep(2)} className="gap-1.5">
                {t("onboarding.next")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Target className="h-7 w-7 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-lg font-semibold">{t("onboarding.goalTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("onboarding.goalBody")}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">{t("onboarding.goalLabel")}</Label>
              <Input
                id="goal"
                type="number"
                min={0}
                max={MAX_WEEKLY_GOAL_ML}
                value={goalWeeklyMl}
                placeholder={t("onboarding.goalPlaceholder")}
                onChange={(e) => {
                  setGoalWeeklyMl(e.target.value === "" ? "" : Number(e.target.value));
                  setAimingToStop(false);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setGoalWeeklyMl(0);
                  setAimingToStop(true);
                }}
                className="text-xs text-emerald-700 dark:text-emerald-300 underline-offset-2 hover:underline"
              >
                {t("onboarding.aimToStop")}
              </button>
            </div>

            {/* Project rule #3: never let someone choose cold turkey without the
                withdrawal warning. We don't know their drinking level yet, and
                the copy is conditionally worded ("if you drink heavily…"), so it
                informs a dependent drinker without alarming a light one.
                Informs rather than blocks — refusing the goal would just teach
                people to lie about it. */}
            {aimingToStop && <WithdrawalWarning />}

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> {t("onboarding.back")}
              </Button>
              <Button type="button" onClick={finish} disabled={saving}>
                {saving ? t("common.saving") : t("onboarding.start")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
