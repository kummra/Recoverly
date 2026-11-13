"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Building2, Check } from "lucide-react";

import { HeadcountChoice, useProgrammePrivacy } from "@/components/headcount-choice";
import { hasSavedLocale, useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { type Programme, isSample, normaliseCode, welcomeFor } from "@/lib/programme";
import { loadProgramme, lookupProgramme, savePendingCode, saveProgramme } from "@/lib/programme-membership";

type State =
  | { status: "loading" }
  | { status: "unknown" }
  | { status: "failed" }
  | { status: "ready"; programme: Programme };

/** The address segment as the person typed it: it may arrive percent-encoded. */
function readCode(raw: string): string | null {
  try {
    return normaliseCode(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

/**
 * The page a poster's QR code opens, `/join/{code}`. Public: someone scanning it
 * may not have an account yet. It says who is inviting them and, before anything
 * else, what that organisation can and cannot see. Joining happens on this device
 * (see `lib/programme.ts`); a person without an account is sent to make one, and
 * the code waits for them on the dashboard.
 */
export function JoinContent({ rawCode }: { rawCode: string }) {
  const { t, locale, setLocale } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const privacy = useProgrammePrivacy();
  const code = readCode(rawCode);

  const [state, setState] = useState<State>({ status: "loading" });
  const [joinedNow, setJoinedNow] = useState(false);
  const [alreadyIn, setAlreadyIn] = useState(false);
  const [storeFailed, setStoreFailed] = useState(false);
  const [counted, setCounted] = useState(false);

  const load = useCallback(() => {
    if (!code) {
      setState({ status: "unknown" });
      return () => undefined;
    }
    setState({ status: "loading" });
    const controller = new AbortController();
    lookupProgramme(code, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) setState({ status: "ready", programme: result.programme });
      else setState({ status: result.reason === "not-found" || result.reason === "invalid" ? "unknown" : "failed" });
    });
    return () => controller.abort();
  }, [code]);

  useEffect(() => load(), [load]);

  // A programme can name the language its people read. Offer it only to a first-time
  // visitor: someone who has chosen a language already knows what they want.
  const programmeLocale = state.status === "ready" ? state.programme.locale : undefined;
  useEffect(() => {
    if (programmeLocale && !hasSavedLocale()) setLocale(programmeLocale);
  }, [programmeLocale, setLocale]);

  // Is this person already in this very programme?
  const userId = user?.uid;
  const readyCode = state.status === "ready" ? state.programme.code : null;
  useEffect(() => {
    if (userId && readyCode) setAlreadyIn(loadProgramme(userId)?.code === readyCode);
  }, [userId, readyCode]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-xl space-y-4" aria-busy="true">
        <div className="h-8 w-3/4 animate-pulse rounded-xl bg-surface" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  if (state.status === "unknown" || state.status === "failed") {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p role="alert" className="flex items-start gap-2 text-sm leading-relaxed text-body">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              {t(state.status === "unknown" ? "programme.notFound" : "programme.checkFailed")}
            </p>
            <div className="flex flex-wrap gap-2">
              {state.status === "failed" && (
                <Button type="button" onClick={() => load()}>
                  {t("error.retry")}
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/">{t("nav.home")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { programme } = state;
  const sample = isSample(programme);

  const join = () => {
    if (!user) return;
    if (saveProgramme(user.uid, programme, { counted })) {
      setJoinedNow(true);
      setStoreFailed(false);
    } else {
      setStoreFailed(true);
    }
  };
  // The code waits for them: it is picked up on the dashboard once they have an account.
  const rememberCode = () => void savePendingCode(programme.code);

  return (
    <div className="animate-fade-in-up mx-auto max-w-xl space-y-5">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-400">
          <Building2 className="h-4 w-4" aria-hidden />
          Recoverly
        </p>
        <h1 className="text-2xl font-bold leading-tight">{sample ? programme.name : t("programme.invited", { name: programme.name })}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("programme.invitedBody")}</p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{programme.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-body">{welcomeFor(programme, locale)}</p>
          {sample && <p className="text-xs leading-relaxed text-subtle">{t("programme.sample")}</p>}
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-sm leading-relaxed text-body">
            {privacy(programme)}
          </p>

          {authLoading ? null : user ? (
            joinedNow || alreadyIn ? (
              <div className="space-y-3">
                <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {joinedNow ? t("programme.joinedOk", { name: programme.name }) : t("programme.already")}
                </p>
                <Button asChild>
                  <Link href="/dashboard">{t("programme.toDashboard")}</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <HeadcountChoice programme={programme} checked={counted} onChange={setCounted} />
                {storeFailed && (
                  <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                    {t("programme.errStore")}
                  </p>
                )}
                <Button type="button" onClick={join}>
                  {t("programme.join")}
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{t("programme.accountNote")}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild onClick={rememberCode}>
                  <Link href="/login?mode=signup">{t("login.createAccount")}</Link>
                </Button>
                <Button asChild variant="outline" onClick={rememberCode}>
                  <Link href="/login">{t("login.signIn")}</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
