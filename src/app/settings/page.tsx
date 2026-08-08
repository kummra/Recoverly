"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, AlertCircle, User, Shield, ExternalLink } from "lucide-react";
import Link from "next/link";

import { DataManagement } from "@/components/data-management";
import { useT } from "@/components/i18n-provider";
import { LanguageSettings } from "@/components/language-settings";
import { NotificationOptIn } from "@/components/notification-optin";
import { DeleteAccount } from "@/components/delete-account";
import { PasswordChange } from "@/components/password-change";
import { ProtectedRoute } from "@/components/protected-route";
import { WithdrawalWarning } from "@/components/safety-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { getUserProfile, saveUserPreferences } from "@/lib/firestore";
import { MAX_WEEKLY_GOAL_ML, goalSchema } from "@/lib/schemas";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const t = useT();
  const { user } = useAuth();
  const [goalWeeklyMl, setGoalWeeklyMl] = useState(0);
  const [goalType, setGoalType] = useState<"reduce" | "quit">("reduce");
  const [reminderTime, setReminderTime] = useState("");
  const [motivation, setMotivation] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((profile) => {
      if (!profile) return;
      setGoalWeeklyMl(profile.goalWeeklyMl ?? 0);
      setGoalType(profile.goalType ?? "reduce");
      setReminderTime(profile.reminderTime ?? "");
      setMotivation(profile.motivation ?? "");
      setDisplayName(profile.displayName ?? "");
    }).catch(() => {
      setMessage({
        type: "error",
        text: t("settings.loadFailed")
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = goalSchema.safeParse({
      // Quitting means zero alcohol, so the ml limit is not meaningful.
      goalWeeklyMl: goalType === "quit" ? 0 : goalWeeklyMl,
      goalType,
      reminderTime: reminderTime || undefined,
      motivation: motivation.trim() || undefined,
      displayName: displayName.trim() || undefined
    });
    if (!parsed.success) {
      setMessage({ type: "error", text: `Goal must be a whole number between 0 and ${MAX_WEEKLY_GOAL_ML} ml, and reminder must be HH:MM.` });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await saveUserPreferences(user.uid, parsed.data);
      setMessage({ type: "success", text: t("settings.saved") });
    } catch {
      setMessage({ type: "error", text: t("settings.saveFailed") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stagger-children space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold">{t("settings.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t("settings.profileTitle")}
            </CardTitle>
            <CardDescription>{t("settings.profileDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-subtle">{t("settings.account")}</Label>
                <Input value={user?.email ?? user?.phoneNumber ?? t("settings.unknown")} readOnly className="bg-surface-muted text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-subtle">{t("settings.timezone")}</Label>
                <Input value={timezone} readOnly className="bg-surface-muted text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motivation">{t("settings.yourWhy")}</Label>
                <textarea
                  id="motivation"
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value.slice(0, 200))}
                  rows={2}
                  placeholder={t("settings.yourWhyPlaceholder")}
                  className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-emerald-500/50 focus:outline-none"
                />
                <p className="text-xs text-subtle">{t("settings.yourWhyHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">{t("settings.displayName")}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  maxLength={60}
                  placeholder={t("settings.displayNamePlaceholder")}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("goal.question")}</Label>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("goal.question")}>
                  {(["reduce", "quit"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={goalType === type}
                      onClick={() => setGoalType(type)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        goalType === type
                          ? "border-emerald-500 bg-emerald-500/10 font-medium text-foreground"
                          : "border-border text-body hover:bg-surface"
                      }`}
                    >
                      {t(type === "reduce" ? "goal.reduce" : "goal.quit")}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-subtle">
                  {t(goalType === "quit" ? "goal.quitHint" : "goal.reduceHint")}
                </p>
                {/* Rule #3: switching to abstinence is the medically risky change. */}
                {goalType === "quit" && <WithdrawalWarning />}
              </div>

              {goalType === "reduce" && (
              <div className="space-y-2">
                <Label htmlFor="goal">{t("settings.weeklyGoal")}</Label>
                <Input
                  id="goal"
                  type="number"
                  min={0}
                  max={MAX_WEEKLY_GOAL_ML}
                  value={goalWeeklyMl}
                  onChange={(e) => setGoalWeeklyMl(Number(e.target.value))}
                />
                <p className="text-xs text-subtle">{t("settings.weeklyGoalHint")}</p>
              </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reminder">{t("settings.reminderTime")}</Label>
                <Input
                  id="reminder"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
                <p className="text-xs text-subtle">
                  {t("settings.reminderHint")}
                </p>
                <NotificationOptIn reminderTime={reminderTime || undefined} />
              </div>

              {message && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
                  message.type === "success"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-red-500/10 text-red-700 dark:text-red-300"
                }`}>
                  {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {message.text}
                </div>
              )}

              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <LanguageSettings />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                {t("settings.appSafety")}
              </CardTitle>
              <CardDescription>{t("settings.appSafetyDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/10 p-3">
                <p className="font-medium text-amber-700 dark:text-amber-300">{t("settings.importantNotice")}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t("settings.importantNoticeBody")}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/privacy"
                  className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-body transition hover:bg-surface-muted"
                >
                  <ExternalLink className="h-4 w-4 text-subtle" />
                  {t("settings.privacyPolicy")}
                </Link>
                <Link
                  href="/terms"
                  className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-body transition hover:bg-surface-muted"
                >
                  <ExternalLink className="h-4 w-4 text-subtle" />
                  {t("settings.termsOfUse")}
                </Link>
              </div>
            </CardContent>
          </Card>

          <PasswordChange />

          <DataManagement />

          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}
