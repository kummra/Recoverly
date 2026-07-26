"use client";

import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { AlertCircle, Check, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

const MIN_LENGTH = 8;

/**
 * Change password for email/password accounts.
 *
 * Firebase requires a recent login to change a password, so we re-authenticate
 * with the current password first — that also stops someone changing the
 * password on an unattended, already-signed-in session.
 *
 * Hidden for Google/phone users, who have no password to change.
 */
export function PasswordChange() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const hasPasswordAuth = user?.providerData.some((p) => p.providerId === "password") ?? false;
  if (!user || !hasPasswordAuth) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (next.length < MIN_LENGTH) {
      setStatus({ type: "error", text: `New password must be at least ${MIN_LENGTH} characters.` });
      return;
    }
    if (next !== confirm) {
      setStatus({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (next === current) {
      setStatus({ type: "error", text: "New password must be different from the current one." });
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email ?? "", current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, next);
      setCurrent(""); setNext(""); setConfirm("");
      setStatus({ type: "success", text: "Password updated." });
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      const text =
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "Current password is incorrect."
          : code === "auth/weak-password"
            ? "That password is too weak. Try a longer one."
            : code === "auth/too-many-requests"
              ? "Too many attempts. Please wait a moment and try again."
              : "Could not update password. Please try again.";
      setStatus({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-sky-400" />
          Change password
        </CardTitle>
        <CardDescription>You&apos;ll need your current password to confirm it&apos;s you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPw">Current password</Label>
            <Input
              id="currentPw"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPw">New password</Label>
            <Input
              id="newPw"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500">At least {MIN_LENGTH} characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPw">Confirm new password</Label>
            <Input
              id="confirmPw"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {status && (
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
                status.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
              }`}
            >
              {status.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {status.text}
            </div>
          )}

          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
