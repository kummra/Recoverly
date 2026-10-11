"use client";

import { useState } from "react";
import { AlertCircle, Check, MailCheck } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { authErrorKey } from "@/lib/auth-errors";

/**
 * Lets someone with a password confirm their email address.
 *
 * This is not a formality. Firebase treats an unconfirmed email/password
 * sign-in as untrusted, and the first time that person uses "Sign in with
 * Google" on the same address, Google's sign-in replaces it: the password is
 * deleted and email sign-in stops working, with no warning. A confirmed
 * address is trusted, and the two sign-in methods are linked instead.
 *
 * It is offered here rather than sent automatically at sign-up, because an
 * email from a recovery app arriving in an inbox other people can see is the
 * user's call to make, not ours.
 *
 * Hidden for Google-only accounts (Google already vouches for the address) and
 * once the address is confirmed.
 */
export function EmailVerification() {
  const t = useT();
  const { user, sendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const hasPassword = user?.providerData.some((p) => p.providerId === "password") ?? false;
  if (!user || !user.email || !hasPassword || user.emailVerified) return null;

  const send = async () => {
    setSending(true);
    setStatus(null);
    try {
      await sendVerificationEmail();
      setStatus({ type: "success", text: t("account.verifySent", { email: user.email ?? "" }) });
    } catch (err) {
      setStatus({ type: "error", text: t(authErrorKey("reset", err) ?? "login.resetFailed") });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MailCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          {t("account.verifyTitle")}
        </CardTitle>
        <CardDescription>{t("account.verifyBody")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <div
            role={status.type === "error" ? "alert" : "status"}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
              status.type === "success" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300"
            }`}
          >
            {status.type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {status.text}
          </div>
        )}
        <Button type="button" variant="outline" onClick={send} disabled={sending} className="w-full sm:w-auto">
          {sending ? t("login.pleaseWait") : t("account.verifySend")}
        </Button>
      </CardContent>
    </Card>
  );
}
