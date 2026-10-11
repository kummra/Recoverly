"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Chrome, Eye, EyeOff, HeartHandshake, Lock, MailCheck, ShieldCheck } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_NEW_PASSWORD_LENGTH, authErrorKey } from "@/lib/auth-errors";
import { isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";

type Mode = "signIn" | "signUp" | "reset";

export function LoginContent() {
  const t = useT();
  const router = useRouter();
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>("signIn");
  const [busy, setBusy] = useState(false);
  // An i18n key rather than a sentence, so the message follows a language change.
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // This page is served as ready-made HTML, so the form is on screen — and can
  // be typed into — before the script that runs it has loaded. On a slow
  // connection that gap is long. Without the two guards below, pressing
  // "Sign in" in that gap reloads the page with empty fields and no message,
  // and whatever was typed or autofilled is thrown away when the script starts.
  const [ready, setReady] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (emailRef.current?.value) setEmail(emailRef.current.value);
    if (passwordRef.current?.value) setPassword(passwordRef.current.value);
    setReady(true);
  }, []);

  // "Get started" links arrive as /login?mode=signup. Someone new who was shown
  // the sign-in form would type an email, invent a password, press Sign in and
  // be told it was incorrect — the right form has to be the one they land on.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signUp");
  }, []);

  // One place decides when to leave this page: as soon as there is a user,
  // whether they signed in a moment ago or were already signed in on arrival.
  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [authLoading, router, user]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorKey(null);
    setResetSentTo(null);
  };

  // On success `busy` is left on: the effect above is about to navigate away,
  // and re-enabling the button for that instant invites a second submit.
  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorKey(null);
    try {
      if (mode === "signUp") await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
    } catch (err) {
      setErrorKey(authErrorKey(mode === "signUp" ? "signUp" : "signIn", err));
      setBusy(false);
    }
  };

  const submitGoogle = async () => {
    setBusy(true);
    setErrorKey(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorKey(authErrorKey("google", err));
      setBusy(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    setBusy(true);
    setErrorKey(null);
    try {
      await resetPassword(address);
      setResetSentTo(address);
    } catch (err) {
      // A null key means "do not reveal whether this address has an account":
      // show the same confirmation an existing address would get.
      const key = authErrorKey("reset", err);
      if (key) setErrorKey(key);
      else setResetSentTo(address);
    } finally {
      setBusy(false);
    }
  };

  const errorText = !isFirebaseConfigured
    ? t("login.errUnavailable")
    : errorKey
      ? t(errorKey, { min: MIN_NEW_PASSWORD_LENGTH })
      : null;

  const errorAlert = errorText && (
    <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm leading-relaxed text-red-700 dark:text-red-300">
      {errorText}
    </p>
  );

  const emailField = (
    <div className="space-y-2">
      <Label htmlFor="email">{t("login.tabEmail")}</Label>
      <Input
        ref={emailRef}
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          // Correcting the address brings the "send" button back, so a link
          // sent to a mistyped address is not the end of the road.
          if (resetSentTo) setResetSentTo(null);
        }}
        placeholder="you@example.com"
      />
    </div>
  );

  return (
    <div className="animate-fade-in-up mx-auto flex max-w-4xl flex-col gap-6 lg:flex-row lg:items-start">
      {/* Emotional left panel */}
      <div className="flex-1 space-y-6 lg:pt-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Recoverly</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
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
          </h1>
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
          <CardTitle>
            {mode === "reset" ? t("login.resetTitle") : mode === "signUp" ? t("login.createAccount") : t("login.welcomeBack")}
          </CardTitle>
          <CardDescription>
            {mode === "reset" ? t("login.resetDesc") : mode === "signUp" ? t("login.createDesc") : t("login.welcomeDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sign in and Create account sit side by side. Creating an account
              used to be a small grey link under the Sign in button. */}
          {mode !== "reset" && (
            <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
              {(["signIn", "signUp"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => switchMode(option)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    mode === option ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option === "signIn" ? t("login.signIn") : t("login.createAccount")}
                </button>
              ))}
            </div>
          )}

          {/* Both forms say method="post": if the browser ever submits one itself,
              because the script failed to load, nothing typed here can end up
              in the address bar. */}
          {mode === "reset" ? (
            <form onSubmit={submitReset} method="post" className="space-y-4">
              {emailField}
              {errorAlert}
              {resetSentTo ? (
                <p role="status" className="flex gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{t("login.resetSent", { email: resetSentTo })}</span>
                </p>
              ) : (
                <Button className="w-full" type="submit" disabled={!ready || busy || !isFirebaseConfigured}>
                  {busy ? t("login.pleaseWait") : t("login.resetSend")}
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                type="button"
                onClick={() => switchMode("signIn")}
              >
                {t("login.resetBack")}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitEmail} method="post" className="space-y-4">
              {emailField}
              <div className="space-y-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <div className="relative">
                  {/* The length rule applies to NEW passwords only. Putting it
                      on the sign-in form would lock out anyone whose existing
                      password is shorter. */}
                  <Input
                    ref={passwordRef}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "signUp" ? MIN_NEW_PASSWORD_LENGTH : undefined}
                    autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                    aria-describedby={mode === "signUp" ? "password-hint" : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-11"
                  />
                  {/* There is one password box and no "confirm" box, so being
                      able to look at what was typed is the guard against
                      creating an account with a typo nobody can reproduce. */}
                  <button
                    type="button"
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((shown) => !shown)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-2xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "signUp" && (
                  <p id="password-hint" className="text-xs text-subtle">
                    {t("login.passwordHint", { min: MIN_NEW_PASSWORD_LENGTH })}
                  </p>
                )}
                {/* Also offered while creating an account once we know the
                    address is taken: that message tells the person to use
                    this link, so it has to be on the screen. */}
                {(mode === "signIn" || errorKey === "login.errEmailInUse") && (
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="block rounded text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("login.forgotPassword")}
                  </button>
                )}
              </div>
              {errorAlert}
              <Button className="w-full" type="submit" disabled={!ready || busy || !isFirebaseConfigured}>
                {busy ? t("login.pleaseWait") : mode === "signUp" ? t("login.createAccount") : t("login.signIn")}
              </Button>
            </form>
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
            disabled={!ready || busy || !isFirebaseConfigured}
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
