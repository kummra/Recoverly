"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, AlertCircle, User, Shield, ExternalLink } from "lucide-react";
import Link from "next/link";

import { DeleteAccount } from "@/components/delete-account";
import { ProtectedRoute } from "@/components/protected-route";
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
  const { user } = useAuth();
  const [goalWeeklyMl, setGoalWeeklyMl] = useState(0);
  const [reminderTime, setReminderTime] = useState("");
  const [motivation, setMotivation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((profile) => {
      if (!profile) return;
      setGoalWeeklyMl(profile.goalWeeklyMl ?? 0);
      setReminderTime(profile.reminderTime ?? "");
      setMotivation(profile.motivation ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = goalSchema.safeParse({ goalWeeklyMl, reminderTime: reminderTime || undefined, motivation: motivation.trim() || undefined });
    if (!parsed.success) {
      setMessage({ type: "error", text: `Goal must be a whole number between 0 and ${MAX_WEEKLY_GOAL_ML} ml, and reminder must be HH:MM.` });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await saveUserPreferences(user.uid, parsed.data);
      setMessage({ type: "success", text: "Preferences saved successfully." });
    } catch {
      setMessage({ type: "error", text: "Could not save preferences. Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stagger-children space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-slate-400">Customize your recovery experience.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-emerald-400" />
              Profile & Preferences
            </CardTitle>
            <CardDescription>Keep your goals realistic and consistent.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Account</Label>
                <Input value={user?.email ?? user?.phoneNumber ?? "Unknown"} readOnly className="bg-slate-900/50 text-slate-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Timezone</Label>
                <Input value={timezone} readOnly className="bg-slate-900/50 text-slate-400" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motivation">Your why</Label>
                <textarea
                  id="motivation"
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value.slice(0, 200))}
                  rows={2}
                  placeholder="My family, my health, the person I want to be…"
                  className="w-full rounded-xl border border-border bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                />
                <p className="text-xs text-slate-500">Your anchor on hard days — shown on your dashboard.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal">Weekly Goal (ml)</Label>
                <Input
                  id="goal"
                  type="number"
                  min={0}
                  max={MAX_WEEKLY_GOAL_ML}
                  value={goalWeeklyMl}
                  onChange={(e) => setGoalWeeklyMl(Number(e.target.value))}
                />
                <p className="text-xs text-slate-500">Set a weekly consumption limit to track against. 0 means no limit.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder">Preferred reminder time</Label>
                <Input
                  id="reminder"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  After this time, a gentle check-in prompt appears on your dashboard (once a day).
                  It shows while the app is open — it is not a phone notification.
                </p>
              </div>

              {message && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
                  message.type === "success"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-red-500/10 text-red-300"
                }`}>
                  {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {message.text}
                </div>
              )}

              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Saving..." : "Save preferences"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-sky-400" />
                App & Safety
              </CardTitle>
              <CardDescription>Use this app as support, not as medical replacement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
                <p className="font-medium text-amber-300">Important notice</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  This app is not a substitute for professional medical advice. If you feel in danger
                  or at risk of self-harm, please seek immediate help from a trusted professional or emergency service.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/privacy"
                  className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-slate-300 transition hover:bg-slate-900/50"
                >
                  <ExternalLink className="h-4 w-4 text-slate-500" />
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm text-slate-300 transition hover:bg-slate-900/50"
                >
                  <ExternalLink className="h-4 w-4 text-slate-500" />
                  Terms of Use
                </Link>
              </div>
            </CardContent>
          </Card>

          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}
