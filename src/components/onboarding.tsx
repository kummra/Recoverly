"use client";

import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Heart, Sparkles, Target } from "lucide-react";

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
  const [step, setStep] = useState<1 | 2>(1);
  const [motivation, setMotivation] = useState("");
  const [goalWeeklyMl, setGoalWeeklyMl] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    const goal = goalWeeklyMl === "" ? 0 : Number(goalWeeklyMl);
    const parsed = goalSchema.safeParse({
      goalWeeklyMl: goal,
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
      setError("Could not save right now. Please try again.");
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
                <h3 className="text-lg font-semibold">Welcome to Recoverly</h3>
                <p className="text-sm text-muted-foreground">A calm, judgment-free space. Let&apos;s set you up in two small steps.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="why" className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                What&apos;s bringing you here?
              </Label>
              <textarea
                id="why"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value.slice(0, 200))}
                rows={3}
                placeholder="My family, my health, the person I want to be…"
                className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-emerald-500/50 focus:outline-none"
              />
              <p className="text-xs text-subtle">
                This becomes your anchor on hard days. Optional — you can add it later in Settings.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
                Skip for now
              </Button>
              <Button type="button" onClick={() => setStep(2)} className="gap-1.5">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Target className="h-7 w-7 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-lg font-semibold">Set a gentle goal</h3>
                <p className="text-sm text-muted-foreground">Small and realistic beats all-or-nothing. You can change this any time.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Weekly limit (ml)</Label>
              <Input
                id="goal"
                type="number"
                min={0}
                max={MAX_WEEKLY_GOAL_ML}
                value={goalWeeklyMl}
                placeholder="e.g. 750"
                onChange={(e) => setGoalWeeklyMl(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <button
                type="button"
                onClick={() => setGoalWeeklyMl(0)}
                className="text-xs text-emerald-700 dark:text-emerald-300 underline-offset-2 hover:underline"
              >
                I&apos;m aiming to stop entirely (0 ml)
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={finish} disabled={saving}>
                {saving ? "Saving…" : "Start my journey"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
