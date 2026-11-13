"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Check, UsersRound } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useProgramme } from "@/hooks/use-programme";
import { SHARE_LIMITS, SHARE_SECTIONS, type ShareFacts, type ShareSection, buildSnapshot } from "@/lib/share";
import { formatKeyId } from "@/lib/workspace";
import { type OwnCopy, type SendOutcome, type TeamKey, fetchTeamKey, listOwnCopies, sendToTeam, stopOwnCopy } from "@/lib/workspace-client";
import { clearWorkspacePrefs, loadWorkspacePrefs, saveWorkspacePrefs } from "@/lib/workspace-prefs";

/** The words for each thing that can go in: the headings on the report itself, as for a summary link. */
const SECTION_LABEL_KEYS: Record<ShareSection, string> = {
  progress: "report.consumption",
  audit: "report.auditHeading",
  cravings: "report.cravingsHeading",
  patterns: "report.patternsHeading",
  why: "report.motivationHeading",
  notes: "report.notesLabel",
  plans: "report.plansHeading"
};

const FAILURE_KEYS: Record<Extract<SendOutcome, { ok: false }>["reason"], string> = {
  crypto: "workspace.noCrypto",
  empty: "share.pick",
  "key-changed": "workspace.keyChanged",
  "not-found": "share.failed",
  limit: "share.failed",
  busy: "share.failed",
  unavailable: "share.failed",
  network: "share.failed"
};

const dateTime = (ms: number) => format(new Date(ms), "d MMM yyyy, h:mm a");

/**
 * "Share with the team": a person in a programme whose organisation has a team workspace (a clinic
 * or a community service, never a workplace or a college) may share their own progress with that
 * team, by name. This hands an organisation individual-level data, so the screen is built around
 * the person's own, informed, undoable act (firm rule 4, `lib/workspace.ts`):
 *
 *  - It is not shown at all unless the programme has it switched on.
 *  - Nothing is sent until they have read what it means, ticked "I understand" and pressed Start
 *    sharing. Nothing is ever sent in the background: what the team holds is what they last sent,
 *    and it ends 30 days after.
 *  - Only the sections they tick, under a name they type, never their account. The starting point is
 *    progress only.
 *  - It is scrambled here for the team's key; the team's key fingerprint is shown so they can check
 *    it with the team. Recoverly cannot read it.
 *  - Stopping is one press and deletes the copy.
 * What the person is sharing is always asked of the server, never remembered here, so this screen
 * cannot say they share when they do not.
 */
export function WorkspaceShare({ facts }: { facts: ShareFacts }) {
  const { t } = useI18n();
  const { user, getIdToken } = useAuth();
  const uid = user?.uid;
  const [programme] = useProgramme(uid);
  const tokenRef = useRef(getIdToken);
  useEffect(() => {
    tokenRef.current = getIdToken;
  }, [getIdToken]);

  const offered = Boolean(programme?.workspace);
  const code = programme?.code ?? "";
  const name = programme?.name ?? "";

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

  const [team, setTeam] = useState<TeamKey | null>(null);
  const [copies, setCopies] = useState<OwnCopy[]>([]);
  /** The sample programme stores nothing, so a practice send is only remembered here, until the page is left. */
  const [practiceSent, setPracticeSent] = useState<{ updatedAt: number; expiresAt: number } | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<ShareSection>>(() => new Set<ShareSection>(["progress"]));
  const [label, setLabel] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ key: string; expires?: number } | null>(null);

  const chosen = SHARE_SECTIONS.filter((section) => picked.has(section) && available[section]);

  const refresh = useCallback(async () => {
    const list = await listOwnCopies(await tokenRef.current());
    if (list) setCopies(list);
  }, []);

  const loadTeam = useCallback(async () => {
    if (!code) return;
    const outcome = await fetchTeamKey(code, await tokenRef.current());
    setTeam(outcome.ok ? outcome.team : null);
  }, [code]);

  // Ask the server who the team is and what this person already shares, once when the card appears.
  useEffect(() => {
    if (!uid || !offered) return;
    void loadTeam();
    void refresh();
  }, [uid, offered, loadTeam, refresh]);

  // Bring back the name and sections they last sent (kept on this device only), so an update does not
  // quietly replace their name with a blank one.
  useEffect(() => {
    if (!uid || !offered || !code) return;
    const prefs = loadWorkspacePrefs(uid, code);
    if (prefs) {
      setLabel(prefs.label);
      setPicked(new Set(prefs.sections));
    }
  }, [uid, offered, code]);

  if (!offered || !programme) return null;

  const mine = copies.find((copy) => copy.code === code) ?? null;
  const sharing = mine ?? (team?.practice ? practiceSent : null);
  const stale = mine !== null && !mine.current;
  const showForm = !sharing || editing || stale;

  const toggle = (section: ShareSection) => {
    setErrorKey(null);
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const send = async () => {
    if (busy || !team) return;
    setErrorKey(null);
    setNotice(null);
    if (chosen.length === 0) {
      setErrorKey("share.pick");
      return;
    }
    setBusy(true);
    const snapshot = buildSnapshot(facts, chosen, { label: label.trim() || undefined });
    const outcome = await sendToTeam({ snapshot, code, team, token: await getIdToken() });
    setBusy(false);
    if (outcome.ok) {
      if (uid) saveWorkspacePrefs(uid, code, { label: label.trim(), sections: chosen });
      if (!outcome.stored) setPracticeSent({ updatedAt: outcome.updatedAt, expiresAt: outcome.expiresAt });
      setEditing(false);
      setNotice({ key: "workspace.sent", expires: outcome.expiresAt });
      await refresh();
      return;
    }
    if (outcome.reason === "key-changed") await loadTeam();
    setErrorKey(FAILURE_KEYS[outcome.reason]);
  };

  const stop = async () => {
    if (busy) return;
    setErrorKey(null);
    setBusy(true);
    const stopped = team?.practice ? true : await stopOwnCopy(await getIdToken(), code);
    setBusy(false);
    if (!stopped) {
      setErrorKey("share.failed");
      return;
    }
    setPracticeSent(null);
    setEditing(false);
    setUnderstood(false);
    // Stopping starts afresh: what they had chosen is forgotten on this device too.
    if (uid) clearWorkspacePrefs(uid, code);
    setLabel("");
    setPicked(new Set<ShareSection>(["progress"]));
    setNotice({ key: "workspace.stopped" });
    await refresh();
  };

  return (
    <Card className="print:hidden" aria-labelledby="workspace-title">
      <CardHeader>
        <CardTitle id="workspace-title" className="flex items-center gap-2 text-base">
          <UsersRound className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("workspace.title", { name })}
        </CardTitle>
        <CardDescription className="leading-relaxed">{t("workspace.intro", { name })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {team?.practice && <p className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">{t("workspace.practice")}</p>}

        {sharing && (
          <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4" role="status">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              <Check className="h-4 w-4" aria-hidden />
              {t("workspace.active", { name })}
            </p>
            <p className="text-sm leading-relaxed text-body">{t("workspace.activeLine", { updated: dateTime(sharing.updatedAt), expires: dateTime(sharing.expiresAt) })}</p>
          </div>
        )}

        {stale && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t("workspace.keyChanged")}
          </p>
        )}

        {showForm && (
          <>
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
              <Label htmlFor="workspace-name">{t("share.nameLabel")}</Label>
              <Input id="workspace-name" value={label} maxLength={SHARE_LIMITS.labelMax} autoComplete="off" onChange={(event) => setLabel(event.target.value)} />
              <p className="text-xs text-subtle">{t("workspace.nameHint")}</p>
            </div>

            {team && !team.practice && <p className="text-xs leading-relaxed text-subtle">{t("workspace.keyId", { id: formatKeyId(team.keyId) })}</p>}

            {!sharing && (
              <label className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-muted/50 p-3 text-sm leading-relaxed">
                <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
                {t("workspace.understand", { name })}
              </label>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={send} disabled={busy || !team || (!sharing && !understood)}>
                {sharing ? t("workspace.update") : t("workspace.start")}
              </Button>
              {sharing && editing && (
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  {t("programme.notNow")}
                </Button>
              )}
            </div>
          </>
        )}

        {sharing && !showForm && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setEditing(true)}>
              {t("workspace.update")}
            </Button>
          </div>
        )}

        {sharing && (
          <Button type="button" variant="outline" onClick={stop} disabled={busy}>
            {t("workspace.stop")}
          </Button>
        )}

        {errorKey && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t(errorKey)}
          </p>
        )}
        {notice && (
          <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t(notice.key, { name, expires: notice.expires ? dateTime(notice.expires) : "" })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
