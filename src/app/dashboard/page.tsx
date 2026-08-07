"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock, Droplets, Flame, Heart, Sparkles, Target } from "lucide-react";
import { format } from "date-fns";

import { CravingSos } from "@/components/craving-sos";
import { DailyNudge } from "@/components/daily-nudge";
import { useT } from "@/components/i18n-provider";
import { LogDrinkModal } from "@/components/log-drink-modal";
import { Onboarding } from "@/components/onboarding";
import { ProtectedRoute } from "@/components/protected-route";
import { MedicalDisclaimer } from "@/components/safety-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { buildProgress } from "@/lib/analytics";
import { type DrinkRecord, getDrinkRecords, getUserProfile } from "@/lib/firestore";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const t = useT();
  const { user } = useAuth();
  const [records, setRecords] = useState<DrinkRecord[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [motivation, setMotivation] = useState("");
  const [reminderTime, setReminderTime] = useState<string | undefined>(undefined);
  const [hasProfile, setHasProfile] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Derive month label, filtered records, and total from a single Date so they
  // can never desync across a month boundary. Recomputes whenever records change.
  const { monthName, monthRecords, monthlyTotal } = useMemo(() => {
    const now = new Date();
    const name = now.toLocaleDateString(undefined, { month: "long" });
    const filtered = records.filter(
      (r) => r.createdAt.getMonth() === now.getMonth() && r.createdAt.getFullYear() === now.getFullYear()
    );
    return {
      monthName: name,
      monthRecords: filtered,
      monthlyTotal: filtered.reduce((s, r) => s + r.quantity, 0)
    };
  }, [records]);

  // Calculate this week's total (Mon-Sun)
  const weeklyTotal = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return records.filter((r) => r.createdAt >= monday).reduce((s, r) => s + r.quantity, 0);
  }, [records]);

  const weeklyProgress = weeklyGoal > 0 ? Math.min((weeklyTotal / weeklyGoal) * 100, 100) : 0;
  const recentRecords = useMemo(() => [...records].reverse().slice(0, 5), [records]);
  const progress = useMemo(() => buildProgress(records), [records]);

  const refresh = async () => {
    if (!user) return;
    try {
      const [fetchedRecords, profile] = await Promise.all([
        getDrinkRecords(user.uid),
        getUserProfile(user.uid)
      ]);
      setRecords(fetchedRecords);
      setHasProfile(profile !== null);
      if (profile) {
        setWeeklyGoal(profile.goalWeeklyMl);
        setMotivation(profile.motivation ?? "");
        setReminderTime(profile.reminderTime);
      }
      setLoadFailed(false);
    } catch {
      // Never let a failed load masquerade as "no data" — an existing user
      // being shown the new-user welcome would read as losing their history.
      setLoadFailed(true);
    } finally {
      setLoaded(true);
    }
  };

  // A truly new user (no saved profile and no logs) gets the gentle first-run
  // flow instead of an empty dashboard. Existing users never see it.
  const needsOnboarding = loaded && !loadFailed && !hasProfile && records.length === 0 && !dismissedOnboarding;

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  if (needsOnboarding && user) {
    return (
      <div className="stagger-children space-y-6">
        <div>
          <h2 className="text-xl font-bold">{t("dashboard.welcome")}</h2>
          <p className="text-sm text-muted-foreground">{t("dashboard.welcomeBody")}</p>
        </div>
        <Onboarding userId={user.uid} onComplete={refresh} onSkip={() => setDismissedOnboarding(true)} />
      </div>
    );
  }

  return (
    <div className="stagger-children space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold">{t("dashboard.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {loadFailed && (
        <Card className="border-amber-500/30">
          <CardContent className="pt-6">
            <p className="text-sm text-body">{t("dashboard.loadFailed")}</p>
          </CardContent>
        </Card>
      )}

      <DailyNudge reminderTime={reminderTime} />

      {/* Identity + streak hero — the motivational anchor (never shaming) */}
      <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-50 dark:from-emerald-950/30 via-card to-card">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <CardContent className="relative space-y-5 pt-6">
          {!progress.hasHistory ? (
            <div className="flex items-center gap-4">
              <Sparkles className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-lg font-semibold">{t("dashboard.journeyStarts")}</p>
                <p className="text-sm text-muted-foreground">{t("dashboard.journeyStartsBody")}</p>
              </div>
            </div>
          ) : progress.currentStreakDays >= 1 ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-3">
                <Flame className="h-9 w-9 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300/80">{t("dashboard.choosingAwareness")}</p>
                  <p className="text-4xl font-bold leading-none">
                    {progress.currentStreakDays}
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                      {progress.currentStreakDays === 1
                        ? t("dashboard.dayAlcoholFree")
                        : t("dashboard.daysAlcoholFree")}
                    </span>
                  </p>
                </div>
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">{t("dashboard.identityLine")}</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Sparkles className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-lg font-semibold">{t("dashboard.freshPage")}</p>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const unit =
                      progress.longestStreakDays === 1
                        ? t("dashboard.dayUnit")
                        : t("dashboard.daysUnit");
                    const [before, after = ""] = t("dashboard.freshPageBody").split("{days}");
                    return (
                      <>
                        {before}
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {progress.longestStreakDays} {unit}
                        </span>
                        {after}
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>
          )}

          {motivation && (
            <p className="flex items-start gap-1.5 text-sm italic text-emerald-800/80 dark:text-emerald-200/70">
              <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {motivation}
            </p>
          )}

          {progress.hasHistory && (
            <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
              <div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{progress.longestStreakDays}</p>
                <p className="text-[11px] text-muted-foreground">{t("dashboard.longestStreak")}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-sky-600 dark:text-sky-400">
                  {progress.alcoholFreeDaysThisMonth}
                  <span className="text-xs font-normal text-subtle">/{progress.daysElapsedThisMonth}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">{t("dashboard.alcoholFreeDays")}</p>
              </div>
              <div>
                <p className="text-xl font-bold">{progress.totalCheckIns}</p>
                <p className="text-[11px] text-muted-foreground">{t("dashboard.mindfulCheckIns")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Primary action */}
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-card to-emerald-50 dark:to-emerald-950/20">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            {t("dashboard.quickCheckIn")}
          </CardTitle>
          <CardDescription>{t("dashboard.quickCheckInBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <LogDrinkModal userId={user.uid} onSaved={refresh} />
              <CravingSos userId={user.uid} motivation={motivation || undefined} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <MedicalDisclaimer />

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-sky-500/20 bg-sky-50 dark:bg-sky-950/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
              <Droplets className="h-3.5 w-3.5" />
              {t("dashboard.monthTotal", { month: monthName })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthlyTotal} <span className="text-sm font-normal text-muted-foreground">ml</span></p>
          </CardContent>
        </Card>

        <Card className={weeklyGoal > 0 ? (weeklyTotal <= weeklyGoal ? "border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/10" : "border-amber-500/20 bg-amber-50 dark:bg-amber-950/10") : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {t("dashboard.weeklyVsGoal")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {weeklyTotal} <span className="text-sm font-normal text-muted-foreground">/ {weeklyGoal || t("dashboard.noGoal")} ml</span>
            </p>
            {weeklyGoal > 0 && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${weeklyTotal <= weeklyGoal ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${weeklyProgress}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t("dashboard.thisMonth")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthRecords.length} <span className="text-sm font-normal text-muted-foreground">{t("dashboard.checkIns")}</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.recentActivity")}</CardTitle>
          <CardDescription>{t("dashboard.recentActivityBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <p className="text-sm text-subtle">{t("dashboard.noRecords")}</p>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-xs font-medium capitalize text-body">
                      {record.type.slice(0, 2)}
                    </div>
                    <div>
                      <span className="font-medium capitalize">{record.otherType || record.type}</span>
                      {record.mood && <span className="ml-2 text-xs text-subtle">{record.mood}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{record.quantity} ml</span>
                    <p className="text-xs text-subtle">{format(record.createdAt, "MMM d, h:mm a")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
