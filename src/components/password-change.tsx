"use client";

import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { AlertCircle, Check, KeyRound } from "lucide-react";

import { useT } from "@/components/i18n-provider";
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
  const t = useT();
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
      setStatus({ type: "error", text: t("account.pwMismatch") });
      return;
    }
    if (next === current) {
      setStatus({ type: "error", text: t("account.pwSameAsOld") });
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email ?? "", current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, next);
      setCurrent(""); setNext(""); setConfirm("");
      setStatus({ type: "success", text: t("account.pwUpdated") });
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      const text =
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? t("account.pwWrongCurrent")
          : code === "auth/weak-password"
            ? t("account.pwTooWeak")
            : code === "auth/too-many-requests"
              ? t("account.pwTooManyAttempts")
              : t("account.pwUpdateFailed");
      setStatus({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          {t("account.changePassword")}
        </CardTitle>
        <CardDescription>{t("account.pwDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPw">{t("account.currentPw")}</Label>
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
            <Label htmlFor="newPw">{t("account.newPw")}</Label>
            <Input
              id="newPw"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
            <p className="text-xs text-subtle">At least {MIN_LENGTH} characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPw">{t("account.confirmPw")}</Label>
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
                status.type === "success" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300"
              }`}
            >
              {status.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {status.text}
            </div>
          )}

          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? t("account.updating") : t("account.updatePw")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
