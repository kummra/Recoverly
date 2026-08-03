"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake, ShieldCheck, Lock, Mail, Phone, Chrome } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthTab = "email" | "phone";

export default function LoginPage() {
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
      setLocalError("Authentication failed. Please verify your credentials and try again.");
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
      setLocalError("Google sign-in failed. Please try again.");
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
      setLocalError("Could not send code. Verify the phone number and try again.");
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
      setLocalError("Invalid code. Please check and try again.");
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
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Recoverly</span>
          </div>
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
            Every step toward{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-sky-600 dark:from-emerald-400 dark:to-sky-400 bg-clip-text text-transparent">
              awareness
            </span>{" "}
            is a step worth taking.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            You are making a meaningful choice by being here. This platform tracks your journey,
            provides honest insights, and supports you with compassionate AI guidance.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-medium">Private & secure</p>
              <p className="text-xs text-subtle">Your data is encrypted and only visible to you.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted p-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
            <div>
              <p className="text-sm font-medium">No judgment, ever</p>
              <p className="text-xs text-subtle">Built on identity-reinforcement, not shame.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth form */}
      <Card className="w-full lg:w-[420px]">
        <CardHeader>
          <CardTitle>{tab === "email" ? (isRegister ? "Create account" : "Welcome back") : "Phone sign-in"}</CardTitle>
          <CardDescription>
            {tab === "email"
              ? isRegister
                ? "Set up your recovery companion in seconds."
                : "Your journey continues. Sign in to pick up where you left off."
              : otpSent
                ? "Enter the 6-digit code sent to your phone."
                : "We\u2019ll send a verification code via SMS."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ── Tab switcher ─────────────────────────────── */}
          <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => { setTab("email"); setLocalError(""); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                tab === "email" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </button>
            <button
              type="button"
              onClick={() => { setTab("phone"); setLocalError(""); setOtpSent(false); setOtpCode(""); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                tab === "phone" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Phone className="h-3.5 w-3.5" />
              Phone
            </button>
          </div>

          {/* ── Email tab ────────────────────────────────── */}
          {tab === "email" && (
            <>
              <form onSubmit={submitEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                {displayError && (
                  <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                    {displayError}
                  </p>
                )}
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
                </Button>
              </form>

              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => { setIsRegister((prev) => !prev); setLocalError(""); }}
                type="button"
              >
                {isRegister ? "Already have an account? Sign in" : "New here? Create an account"}
              </Button>
            </>
          )}

          {/* ── Phone tab ────────────────────────────────── */}
          {tab === "phone" && (
            <>
              {!otpSent ? (
                <form onSubmit={submitPhoneSendCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                    <p className="text-xs text-subtle">Include country code (e.g. +1 for US, +91 for India).</p>
                  </div>
                  {displayError && (
                    <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                      {displayError}
                    </p>
                  )}
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? "Sending code..." : "Send verification code"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={submitPhoneVerifyCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification code</Label>
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
                      Code sent to <span className="font-medium text-body">{phoneNumber}</span>.
                    </p>
                  </div>
                  {displayError && (
                    <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                      {displayError}
                    </p>
                  )}
                  <Button className="w-full" type="submit" disabled={loading || otpCode.length < 6}>
                    {loading ? "Verifying..." : "Verify & sign in"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground"
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(""); setLocalError(""); }}
                  >
                    Change phone number
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
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
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
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
