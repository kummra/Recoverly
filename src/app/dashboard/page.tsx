"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock, Droplets, Target } from "lucide-react";
import { format } from "date-fns";

import { LogDrinkModal } from "@/components/log-drink-modal";
import { ProtectedRoute } from "@/components/protected-route";
import { MedicalDisclaimer } from "@/components/safety-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { type DrinkRecord, getDrinkRecords, getUserProfile } from "@/lib/firestore";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [records, setRecords] = useState<DrinkRecord[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(0);

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

  const refresh = async () => {
    if (!user) return;
    const [fetchedRecords, profile] = await Promise.all([
      getDrinkRecords(user.uid),
      getUserProfile(user.uid)
    ]);
    setRecords(fetchedRecords);
    if (profile) setWeeklyGoal(profile.goalWeeklyMl);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return (
    <div className="stagger-children space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold">Dashboard</h2>
        <p className="text-sm text-slate-400">Pause, breathe, and log intentionally.</p>
      </div>

      {/* Primary action */}
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-slate-900/90 to-emerald-950/20">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            Quick Check-in
          </CardTitle>
          <CardDescription>
            Awareness is a skill you are strengthening. Every log is data that empowers your future self.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? <LogDrinkModal userId={user.uid} onSaved={refresh} /> : null}
        </CardContent>
      </Card>

      <MedicalDisclaimer />

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-sky-500/20 bg-sky-950/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-sky-400">
              <Droplets className="h-3.5 w-3.5" />
              {monthName} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthlyTotal} <span className="text-sm font-normal text-slate-400">ml</span></p>
          </CardContent>
        </Card>

        <Card className={weeklyGoal > 0 ? (weeklyTotal <= weeklyGoal ? "border-emerald-500/20 bg-emerald-950/10" : "border-amber-500/20 bg-amber-950/10") : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Weekly vs goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {weeklyTotal} <span className="text-sm font-normal text-slate-400">/ {weeklyGoal || "no goal"} ml</span>
            </p>
            {weeklyGoal > 0 && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
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
              This month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthRecords.length} <span className="text-sm font-normal text-slate-400">check-ins</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Your last check-ins at a glance.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <p className="text-sm text-slate-500">No records yet. Your first log will appear here.</p>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-slate-900/50 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-xs font-medium capitalize text-slate-300">
                      {record.type.slice(0, 2)}
                    </div>
                    <div>
                      <span className="font-medium capitalize">{record.type}</span>
                      {record.mood && <span className="ml-2 text-xs text-slate-500">{record.mood}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{record.quantity} ml</span>
                    <p className="text-xs text-slate-500">{format(record.createdAt, "MMM d, h:mm a")}</p>
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
