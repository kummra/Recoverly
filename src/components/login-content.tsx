"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake, ShieldCheck, Lock, Mail, Phone, Chrome } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthTab = "email" | "phone";

export function LoginContent() {
  const t = useT();
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, sendPhoneCode, confirmPhoneCode, error } = useAuth();

  const [tab, setTab] = useState<AuthTab>("email");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const displayError = localError || error;

  // ── Email submit ──────────────────────────────────────────
  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError("");
    try {
      if (isRegister) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      router.replace("/dashboard");
    } catch {
      setLocalError(t("login.authFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ── Google submit ─────────────────────────────────────────
  const submitGoogle = async () => {
    setLoading(true);
    setLocalError("");
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch {
      setLocalError(t("login.googleFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ── Phone: send code ──────────────────────────────────────
  const submitPhoneSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setLoading(true);
    setLocalError("");
    try {
      await sendPhoneCode(phoneNumber.trim());
      setOtpSent(true);
    } catch {
      setLocalError(t("login.sendFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ── Phone: verify code ────────────────────────────────────
  const submitPhoneVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setLoading(true);
    setLocalError("");
    try {
      await confirmPhoneCode(otpCode.trim());
      router.replace("/dashboard");
    } catch {
      setLocalError(t("login.invalidCode"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up mx-auto flex max-w-4xl flex-col gap-6 lg:flex-row lg:items-start">
      {/* Emotional left panel */}
      <div className="flex-1 space-y-6 lg:pt-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Recoverly</span>
          </div>
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
            {(() => {
              const [before, after = ""] = t("login.heroTitle").split("{awareness}");
              return (
                <>
                  {before}
                  <span className="bg-gradient-to-r from-emerald-600 to-sky-600 dark:from-emerald-400 dark:to-sky-400 bg-clip-text text-transparent">
                    {t("login.heroAwareness")}
                  </span>
                  {after}
                </>
              );
            })()}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("login.heroBody")}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-medium">{t("login.privateTitle")}</p>
              <p className="text-xs text-subtle">{t("login.privateBody")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
            <div>
              <p className="text-sm font-medium">{t("login.noJudgmentTitle")}</p>
              <p className="text-xs text-subtle">{t("login.noJudgmentBody")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth form */}
      <Card className="w-full lg:w-[420px]">
        <CardHeader>
          <CardTitle>{tab === "email" ? (isRegister ? t("login.createAccount") : t("login.welcomeBack")) : t("login.phoneSignIn")}</CardTitle>
          <CardDescription>
            {tab === "email"
              ? isRegister
                ? t("login.createDesc")
                : t("login.welcomeDesc")
              : otpSent
                ? t("login.otpDesc")
                : t("login.smsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ── Tab switcher ─────────────────────────────── */}
          <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => { setTab("email"); setLocalError(""); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === "email" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              {t("login.tabEmail")}
            </button>
            <button
              type="button"
              onClick={() => { setTab("phone"); setLocalError(""); setOtpSent(false); setOtpCode(""); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === "phone" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Phone className="h-3.5 w-3.5" />
              {t("login.tabPhone")}
            </button>
          </div>

          {/* ── Email tab ────────────────────────────────── */}
          {tab === "email" && (
            <>
              <form onSubmit={submitEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("login.tabEmail")}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("login.password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                  />
                </div>
                {displayError && (
                  <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                    {displayError}
                  </p>
                )}
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? t("login.pleaseWait") : isRegister ? t("login.createAccount") : t("login.signIn")}
                </Button>
              </form>

              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => { setIsRegister((prev) => !prev); setLocalError(""); }}
                type="button"
              >
                {isRegister ? t("login.haveAccount") : t("login.newHere")}
              </Button>
            </>
          )}

          {/* ── Phone tab ────────────────────────────────── */}
          {tab === "phone" && (
            <>
              {!otpSent ? (
                <form onSubmit={submitPhoneSendCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("login.phoneNumber")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                    <p className="text-xs text-subtle">{t("login.countryCodeHint")}</p>
                  </div>
                  {displayError && (
                    <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                      {displayError}
                    </p>
                  )}
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? t("login.sendingCode") : t("login.sendCode")}
                  </Button>
                </form>
              ) : (
                <form onSubmit={submitPhoneVerifyCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">{t("login.verificationCode")}</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="text-center text-lg tracking-[0.3em]"
                    />
                    <p className="text-xs text-subtle">
                      {t("login.codeSentTo", { phone: phoneNumber })}
                    </p>
                  </div>
                  {displayError && (
                    <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                      {displayError}
                    </p>
                  )}
                  <Button className="w-full" type="submit" disabled={loading || otpCode.length < 6}>
                    {loading ? t("login.verifying") : t("login.verifyAndSignIn")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground"
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(""); setLocalError(""); }}
                  >
                    {t("login.changePhone")}
                  </Button>
                </form>
              )}
            </>
          )}

          {/* ── Divider ──────────────────────────────────── */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">{t("login.orContinue")}</span>
            </div>
          </div>

          {/* ── Google sign-in ───────────────────────────── */}
          <Button
            variant="outline"
            className="w-full gap-2"
            type="button"
            disabled={loading}
            onClick={submitGoogle}
          >
            <Chrome className="h-4 w-4" />
            {t("login.googleSignIn")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
