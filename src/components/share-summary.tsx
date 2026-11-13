"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Check, Copy, Share2 } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import {
  DEFAULT_EXPIRY_HOURS,
  SHARE_EXPIRY_HOURS,
  SHARE_LIMITS,
  SHARE_PRESETS,
  SHARE_SECTIONS,
  type ShareExpiryHours,
  type ShareFacts,
  type ShareSection,
  buildSnapshot
} from "@/lib/share";
import { type CreateOutcome, type OwnShare, createShareLink, listOwnShares, stopAllOwnShares, stopOwnShare } from "@/lib/share-client";

/** The words for each thing that can go in. They are the headings on the report itself. */
const SECTION_LABEL_KEYS: Record<ShareSection, string> = {
  progress: "report.consumption",
  audit: "report.auditHeading",
  cravings: "report.cravingsHeading",
  patterns: "report.patternsHeading",
  why: "report.motivationHeading",
  notes: "report.notesLabel",
  plans: "report.plansHeading"
};

const EXPIRY_LABEL_KEYS: Record<ShareExpiryHours, string> = {
  24: "share.expiry1",
  168: "share.expiry7",
  720: "share.expiry30"
};

const FAILURE_KEYS: Record<Extract<CreateOutcome, { ok: false }>["reason"], string> = {
  crypto: "share.noCrypto",
  empty: "share.pick",
  limit: "share.limit",
  busy: "share.failed",
  unavailable: "share.failed",
  network: "share.failed"
};

const dateTime = (ms: number) => format(new Date(ms), "d MMM yyyy, h:mm a");
const dateOnly = (ms: number) => format(new Date(ms), "d MMM yyyy");

/**
 * "Share a summary": make a link to a read-only copy of the clinician summary,
 * for a doctor, a counsellor or someone who supports the person.
 *
 * Everything that makes this safe is in `lib/share.ts`; what the screen adds is
 * honesty and control. Nothing is ticked that the person has not seen: the two
 * starting points never include their own words, notes or plans. The link is
 * shown once and cannot be shown again (nothing about it is kept on this device),
 * says plainly who can read it and until when, and every link they have made is
 * listed with a button that ends it. The summary is scrambled here, in this
 * browser, before anything is sent.
 */
export function ShareSummary({ facts }: { facts: ShareFacts }) {
  const { t } = useI18n();
  const { user, getIdToken } = useAuth();
  // The latest way to get a sign-in token, without making every effect below start over when it changes.
  const tokenRef = useRef(getIdToken);
  useEffect(() => {
    tokenRef.current = getIdToken;
  }, [getIdToken]);

  const available = useMemo<Record<ShareSection, boolean>>(
    () => ({
      progress: true,
      audit: facts.audit !== null,
      cravings: facts.cravings !== null,
      patterns: facts.patterns.length > 0,
      why: Boolean(facts.motivation),
      notes: facts.note.trim() !== "",
      plans: facts.plans.length > 0
    }),
    [facts]
  );

  const [picked, setPicked] = useState<ReadonlySet<ShareSection>>(() => new Set(SHARE_PRESETS.clinician));
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState<ShareExpiryHours>(DEFAULT_EXPIRY_HOURS);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [created, setCreated] = useState<{ link: string; expiresAt: number } | null>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const [shares, setShares] = useState<OwnShare[]>([]);
  const [stopped, setStopped] = useState(false);

  const chosen = SHARE_SECTIONS.filter((section) => picked.has(section) && available[section]);

  const refresh = useCallback(async () => {
    const list = await listOwnShares(await tokenRef.current());
    if (list) setShares(list.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  // Fetch the person's links once when the page opens (and again after they change one), not on every render.
  const uid = user?.uid;
  useEffect(() => {
    if (uid) void refresh();
  }, [uid, refresh]);

  const toggle = (section: ShareSection) => {
    setErrorKey(null);
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const usePreset = (sections: readonly ShareSection[]) => {
    setErrorKey(null);
    setPicked(new Set(sections));
  };

  /** Is what is ticked exactly this starting point (ignoring things this person has nothing for)? */
  const presetIs = (sections: readonly ShareSection[]) => {
    const wanted = sections.filter((section) => available[section]);
    return chosen.length === wanted.length && wanted.every((section) => picked.has(section));
  };

  const create = async () => {
    if (busy) return;
    setErrorKey(null);
    setStopped(false);
    setCopy("idle");
    if (chosen.length === 0) {
      setErrorKey("share.pick");
      return;
    }
    setBusy(true);
    const snapshot = buildSnapshot(facts, chosen, { label: label.trim() || undefined });
    const outcome = await createShareLink({ snapshot, hours, token: await getIdToken(), origin: window.location.origin });
    setBusy(false);
    if (outcome.ok) {
      setCreated({ link: outcome.link, expiresAt: outcome.expiresAt });
      void refresh();
    } else {
      setErrorKey(FAILURE_KEYS[outcome.reason]);
    }
  };

  const copyLink = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  const stopOne = async (id: string) => {
    if (await stopOwnShare(await getIdToken(), id)) {
      setStopped(true);
      setCreated(null);
      await refresh();
    } else {
      setErrorKey("share.failed");
    }
  };

  const stopEvery = async () => {
    if (await stopAllOwnShares(await getIdToken())) {
      setStopped(true);
      setCreated(null);
      await refresh();
    } else {
      setErrorKey("share.failed");
    }
  };

  const clinicianActive = presetIs(SHARE_PRESETS.clinician);
  const supporterActive = presetIs(SHARE_PRESETS.supporter);

  return (
    <Card className="print:hidden" aria-labelledby="share-title">
      <CardHeader>
        <CardTitle id="share-title" className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("share.title")}
        </CardTitle>
        <CardDescription className="leading-relaxed">{t("share.intro")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {created ? (
          <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4" role="status">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              <Check className="h-4 w-4" aria-hidden />
              {t("share.ready")}
            </p>
            <p className="text-sm leading-relaxed text-body">{t("share.readyBody", { date: dateTime(created.expiresAt) })}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                readOnly
                value={created.link}
                aria-label={t("share.ready")}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 font-mono text-xs"
              />
              <Button type="button" variant="outline" onClick={copyLink} className="gap-1.5">
                {copy === "copied" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copy === "copied" ? t("share.copied") : t("share.copy")}
              </Button>
            </div>
            {copy === "failed" && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-300">
                {t("share.copyFailed")}
              </p>
            )}
            <p className="text-xs leading-relaxed text-subtle">{t("share.wholeLink")}</p>
            <div className="flex items-center gap-3">
              <QrCode text={created.link} label={t("share.qrLabel")} className="h-32 w-32 shrink-0 rounded-lg border border-border" />
              <p className="text-xs leading-relaxed text-subtle">{t("share.qrHint")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("share.includeLabel")}>
              <Button type="button" size="sm" variant={clinicianActive ? "default" : "outline"} aria-pressed={clinicianActive} onClick={() => usePreset(SHARE_PRESETS.clinician)}>
                {t("share.presetClinician")}
              </Button>
              <Button type="button" size="sm" variant={supporterActive ? "default" : "outline"} aria-pressed={supporterActive} onClick={() => usePreset(SHARE_PRESETS.supporter)}>
                {t("share.presetSupporter")}
              </Button>
            </div>

            <fieldset className="space-y-1">
              <legend className="mb-1 text-sm font-medium">{t("share.includeLabel")}</legend>
              {SHARE_SECTIONS.filter((section) => available[section]).map((section) => (
                <label key={section} className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={picked.has(section)} onChange={() => toggle(section)} className="h-4 w-4 accent-emerald-600" />
                  {t(SECTION_LABEL_KEYS[section])}
                </label>
              ))}
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="share-name">{t("share.nameLabel")}</Label>
              <Input id="share-name" value={label} maxLength={SHARE_LIMITS.labelMax} autoComplete="off" onChange={(event) => setLabel(event.target.value)} />
              <p className="text-xs text-subtle">{t("share.nameHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="share-expiry">{t("share.expiryLabel")}</Label>
              <select
                id="share-expiry"
                value={hours}
                onChange={(event) => setHours(Number(event.target.value) as ShareExpiryHours)}
                className="h-11 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm text-foreground focus:border-emerald-500/50 focus:outline-none sm:w-auto"
              >
                {SHARE_EXPIRY_HOURS.map((option) => (
                  <option key={option} value={option}>
                    {t(EXPIRY_LABEL_KEYS[option])}
                  </option>
                ))}
              </select>
            </div>

            <Button type="button" onClick={create} disabled={busy}>
              {t("share.create")}
            </Button>
          </>
        )}

        {errorKey && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t(errorKey, { max: SHARE_LIMITS.activeMax })}
          </p>
        )}
        {stopped && (
          <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t("share.stopped")}
          </p>
        )}

        {created && (
          <Button type="button" variant="outline" size="sm" onClick={() => setCreated(null)}>
            {t("share.create")}
          </Button>
        )}

        {shares.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("share.active")}</h3>
              {shares.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={stopEvery}>
                  {t("share.stopAll")}
                </Button>
              )}
            </div>
            <ul className="space-y-2">
              {shares.map((share) => (
                <li key={share.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                  <span className="text-body">{t("share.activeLine", { created: dateOnly(share.createdAt), expires: dateTime(share.expiresAt) })}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => stopOne(share.id)}>
                    {t("share.stop")}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
