"use client";

import { useEffect, useState } from "react";
import { Building2, ExternalLink, Mail, Phone } from "lucide-react";

import { HeadcountChoice, useProgrammePrivacy } from "@/components/headcount-choice";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useProgramme } from "@/hooks/use-programme";
import { type Programme, isSample, welcomeFor } from "@/lib/programme";
import { getDrinkRecords } from "@/lib/firestore";
import { tickIfDue } from "@/lib/programme-headcount";
import { buildProgressFigures } from "@/lib/progress-figures";
import {
  clearPendingCode,
  loadPendingCode,
  loadProgramme,
  lookupProgramme,
  saveProgramme
} from "@/lib/programme-membership";

const CHIP =
  "inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm text-body transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The organisation's support contacts. Every value here has been through
 * `sanitiseProgramme`, so a phone is digits, a link is https and nothing is a
 * script. The numbers are the organisation's own; the app's crisis help (Tele-MANAS
 * and 112) is never replaced by them and sits elsewhere.
 */
export function ProgrammeContacts({ programme }: { programme: Programme }) {
  const { t } = useI18n();
  if (programme.contacts.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("programme.contacts", { name: programme.name })}</p>
      <ul className="space-y-2">
        {programme.contacts.map((contact) => (
          <li key={`${contact.label}|${contact.phone ?? ""}|${contact.email ?? ""}|${contact.url ?? ""}`} className="rounded-xl border border-border p-3 text-sm">
            <p className="font-medium text-foreground">{contact.label}</p>
            {contact.hours && <p className="text-xs text-muted-foreground">{contact.hours}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className={CHIP}>
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className={CHIP}>
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {contact.email}
                </a>
              )}
              {contact.url && (
                <a href={contact.url} target="_blank" rel="noopener noreferrer" className={CHIP}>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {hostOf(contact.url)}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The joined programme, on the dashboard. Shows nothing for someone who has not
 * joined one. The organisation's details are re-read from the server when the
 * card appears, so a number that changed (or was withdrawn) does not sit on a
 * screen for months; the copy in the browser is only what shows first and what
 * shows offline.
 */
export function ProgrammeCard({ userId }: { userId: string }) {
  const { t, locale } = useI18n();
  const { getIdToken } = useAuth();
  const privacy = useProgrammePrivacy();
  const [programme, setProgramme, counted] = useProgramme(userId);
  const [gone, setGone] = useState(false);

  const code = programme?.code;
  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    lookupProgramme(code, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setGone(false);
        const stored = loadProgramme(userId);
        if (stored && JSON.stringify(stored) !== JSON.stringify(result.programme)) {
          saveProgramme(userId, result.programme);
          setProgramme(result.programme);
        }
      } else if (result.reason === "not-found") {
        setGone(true);
      }
    });
    return () => controller.abort();
  }, [code, userId, setProgramme]);

  // The monthly tick, only for someone who ticked "count me" for a programme that offers it.
  // It sends the code and nothing else, at most once a month (lib/programme-headcount.ts).
  const offersHeadcount = programme?.headcount === true;
  useEffect(() => {
    if (!offersHeadcount || !counted || gone) return;
    // Figures are worked out (the records are read) only if the person chose to share them.
    void tickIfDue(userId, getIdToken, { loadFigures: async () => buildProgressFigures(await getDrinkRecords(userId)) });
  }, [offersHeadcount, counted, gone, userId, getIdToken]);

  if (!programme) return null;

  return (
    <Card className="border-sky-500/20">
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          {t("programme.yours")}
        </CardDescription>
        <CardTitle className="text-base">{programme.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {gone ? (
          <p className="text-sm leading-relaxed text-body">{t("programme.gone")}</p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-body">{welcomeFor(programme, locale)}</p>
            {isSample(programme) && <p className="text-xs leading-relaxed text-subtle">{t("programme.sample")}</p>}
            <ProgrammeContacts programme={programme} />
            <p className="text-xs leading-relaxed text-subtle">{privacy(programme)}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Someone scanned a poster before they had an account, signed up, and arrived on
 * the dashboard. This is the one question the code was waiting for. It asks once
 * and forgets the answer either way: "Not now" clears the waiting code.
 */
export function ProgrammePrompt({ userId }: { userId: string }) {
  const { t } = useI18n();
  const privacy = useProgrammePrivacy();
  const [pending, setPending] = useState<Programme | null>(null);
  const [failed, setFailed] = useState(false);
  const [counted, setCounted] = useState(false);
  const [figures, setFigures] = useState(false);

  useEffect(() => {
    const code = loadPendingCode();
    if (!code) return;
    // Already in a programme: do not ask again, and do not leave the code lying about.
    if (loadProgramme(userId)) {
      clearPendingCode();
      return;
    }
    const controller = new AbortController();
    lookupProgramme(code, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) setPending(result.programme);
      else if (result.reason === "not-found" || result.reason === "invalid") clearPendingCode();
    });
    return () => controller.abort();
  }, [userId]);

  if (!pending) return null;

  const join = () => {
    if (saveProgramme(userId, pending, { counted, figures })) {
      clearPendingCode();
      setPending(null);
    } else {
      setFailed(true);
    }
  };
  const decline = () => {
    clearPendingCode();
    setPending(null);
  };

  return (
    <Card className="border-sky-500/30 bg-sky-50 dark:bg-sky-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start gap-2 text-base">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("programme.joinPrompt", { name: pending.name })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-body">{privacy(pending)}</p>
        <HeadcountChoice
          programme={pending}
          checked={counted}
          onChange={(next) => {
            setCounted(next);
            if (!next) setFigures(false);
          }}
          figures={figures}
          onFiguresChange={setFigures}
        />
        {failed && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
            {t("programme.errStore")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={join}>
            {t("programme.join")}
          </Button>
          <Button type="button" variant="outline" onClick={decline}>
            {t("programme.notNow")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
