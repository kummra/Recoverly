"use client";

import { useEffect, useRef, useState } from "react";
import { LifeBuoy, Lock } from "lucide-react";

import { useAppLock } from "@/components/app-lock-context";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "@/lib/app-lock";
import { HELPLINES } from "@/lib/safety";

/**
 * The PIN screen. It replaces the whole app while the lock is closed.
 *
 * Two things here matter more than the lock itself:
 *  - Help is never behind it. Someone reaching for the app in a craving, or in
 *    a worse moment, must be able to dial a helpline without knowing the PIN,
 *    so the two numbers are always on screen as tap-to-call links.
 *  - It is never a dead end. "Forgot your PIN?" signs the person out, which
 *    removes the lock. Their records stay in their account.
 */
export function LockScreen() {
  const t = useT();
  const { unlock } = useAppLock();
  const { signOutUser } = useAuth();

  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const waiting = waitUntil > now;
  const secondsLeft = waiting ? Math.ceil((waitUntil - now) / 1000) : 0;

  // Count the wait down on screen.
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [waiting]);

  // Back to typing once the wait is over.
  useEffect(() => {
    if (!waiting) inputRef.current?.focus();
  }, [waiting]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || waiting || pin.length < PIN_MIN_LENGTH) return;
    setBusy(true);
    const result = await unlock(pin);
    setBusy(false);
    // On success the app takes this screen's place.
    if (result.ok) return;
    setPin("");
    if (result.reason === "wait") {
      const current = Date.now();
      setNow(current);
      setWaitUntil(current + result.seconds * 1000);
      setWrong(false);
    } else {
      setWrong(true);
    }
    inputRef.current?.focus();
  };

  const error = waiting ? t("lock.errWait", { n: secondsLeft }) : wrong ? t("lock.errWrong") : "";

  return (
    <main className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background p-4 sm:items-center">
      <div className="w-full max-w-sm space-y-6 py-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15">
            <Lock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold">{t("lock.enterTitle")}</h1>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Label htmlFor="lock-pin" className="sr-only">
            {t("lock.pinLabel")}
          </Label>
          <Input
            id="lock-pin"
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={PIN_MAX_LENGTH}
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, ""));
              setWrong(false);
            }}
            disabled={busy || waiting}
            autoFocus
            aria-invalid={wrong}
            aria-describedby={error ? "lock-error" : undefined}
            className="text-center text-xl tracking-[0.5em]"
          />
          <p id="lock-error" role="alert" className="min-h-5 text-center text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
          <Button type="submit" className="w-full" disabled={busy || waiting || pin.length < PIN_MIN_LENGTH}>
            {t("lock.unlock")}
          </Button>
        </form>

        {/* Help is never behind the lock. */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-50 p-3 text-sm dark:bg-sky-950/10">
          <p className="flex items-center gap-1.5 font-medium text-sky-700 dark:text-sky-300">
            <LifeBuoy className="h-4 w-4" aria-hidden />
            {t("guide.needHelpNow")}
          </p>
          <p className="mt-2 flex flex-wrap gap-2">
            <a
              href={`tel:${HELPLINES.india.teleManas}`}
              className="rounded-lg bg-sky-500/15 px-2.5 py-1 font-semibold text-sky-800 hover:bg-sky-500/25 dark:text-sky-200"
            >
              Tele-MANAS {HELPLINES.india.teleManas}
            </a>
            <a
              href={`tel:${HELPLINES.india.emergency}`}
              className="rounded-lg bg-sky-500/15 px-2.5 py-1 font-semibold text-sky-800 hover:bg-sky-500/25 dark:text-sky-200"
            >
              {t("safety.emergency")} {HELPLINES.india.emergency}
            </a>
          </p>
        </div>

        <div className="space-y-2 text-center text-sm">
          {confirmingSignOut ? (
            <>
              <p className="text-muted-foreground">{t("lock.forgotBody")}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void signOutUser()}>
                {t("lock.forgotConfirm")}
              </Button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingSignOut(true)}
              className="rounded text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("lock.forgot")}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
