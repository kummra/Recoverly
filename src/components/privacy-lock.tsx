"use client";

import { useState } from "react";
import { AlertCircle, Check, Lock } from "lucide-react";

import { useAppLock } from "@/components/app-lock-context";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_IDLE_MINUTES, IDLE_OPTIONS, type IdleMinutes, PIN_MAX_LENGTH, checkNewPin } from "@/lib/app-lock";

const SELECT_CLASS =
  "flex h-11 w-full rounded-2xl border border-input bg-surface-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Note = { kind: "ok" | "error"; text: string } | null;

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH);

/**
 * Settings card for the privacy lock. The wording is deliberately plain about
 * what it is: a screen against casual onlookers, not encryption. See
 * `lib/app-lock.ts`.
 */
export function PrivacyLock() {
  const t = useT();
  const lock = useAppLock();

  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [idle, setIdle] = useState<IdleMinutes>(DEFAULT_IDLE_MINUTES);
  const [offPin, setOffPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);

  // The setting lives on this device, so there is nothing to show until it has been read.
  if (!lock.ready) return null;

  const turnOn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const problem = checkNewPin(pin);
    if (problem) {
      setNote({ kind: "error", text: t(problem === "easy" ? "lock.errEasy" : "lock.errShort") });
      return;
    }
    if (pin !== again) {
      setNote({ kind: "error", text: t("lock.errMismatch") });
      return;
    }
    setBusy(true);
    const ok = await lock.turnOn(pin, idle);
    setBusy(false);
    if (ok) {
      setPin("");
      setAgain("");
      setNote({ kind: "ok", text: t("lock.savedOn") });
    } else {
      setNote({ kind: "error", text: t("lock.errSave") });
    }
  };

  const turnOff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !offPin) return;
    setBusy(true);
    const result = await lock.turnOff(offPin);
    setBusy(false);
    setOffPin("");
    if (result.ok) {
      setNote({ kind: "ok", text: t("lock.savedOff") });
    } else if (result.reason === "wait") {
      setNote({ kind: "error", text: t("lock.errWait", { n: result.seconds }) });
    } else {
      setNote({ kind: "error", text: t("lock.errWrong") });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("lock.title")}
        </CardTitle>
        <CardDescription>{t("lock.intro")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!lock.supported ? (
          <p className="text-sm text-muted-foreground">{t("lock.errUnsupported")}</p>
        ) : !lock.enabled ? (
          <form onSubmit={turnOn} className="space-y-3" noValidate>
            <div className="space-y-2">
              <Label htmlFor="lock-new-pin">{t("lock.pinLabel")}</Label>
              <Input
                id="lock-new-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={PIN_MAX_LENGTH}
                value={pin}
                onChange={(event) => setPin(digitsOnly(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lock-new-pin-again">{t("lock.confirmLabel")}</Label>
              <Input
                id="lock-new-pin-again"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={PIN_MAX_LENGTH}
                value={again}
                onChange={(event) => setAgain(digitsOnly(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lock-new-idle">{t("lock.autoLabel")}</Label>
              <select
                id="lock-new-idle"
                value={idle}
                onChange={(event) => setIdle(Number(event.target.value) as IdleMinutes)}
                className={SELECT_CLASS}
              >
                {IDLE_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={busy}>
              {t("lock.turnOn")}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4" aria-hidden />
              {t("lock.statusOn")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="lock-idle">{t("lock.autoLabel")}</Label>
              <select
                id="lock-idle"
                value={lock.idleMinutes}
                onChange={(event) => lock.setIdleMinutes(Number(event.target.value) as IdleMinutes)}
                className={SELECT_CLASS}
              >
                {IDLE_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="outline" onClick={lock.lockNow}>
              {t("lock.lockNow")}
            </Button>

            <form onSubmit={turnOff} className="space-y-2 border-t border-border pt-4" noValidate>
              <Label htmlFor="lock-off-pin">{t("lock.pinNeeded")}</Label>
              <Input
                id="lock-off-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={PIN_MAX_LENGTH}
                value={offPin}
                onChange={(event) => setOffPin(digitsOnly(event.target.value))}
              />
              <Button type="submit" variant="outline" disabled={busy || !offPin}>
                {t("lock.turnOff")}
              </Button>
            </form>
          </div>
        )}

        {note && (
          <p
            role={note.kind === "error" ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
              note.kind === "ok"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 text-red-700 dark:text-red-300"
            }`}
          >
            {note.kind === "ok" ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            {note.text}
          </p>
        )}

        <p className="text-xs text-subtle">{t("lock.signOutNote")}</p>
      </CardContent>
    </Card>
  );
}
