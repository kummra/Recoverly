"use client";

import { useState } from "react";
import { AlertCircle, Building2, Check } from "lucide-react";

import { HeadcountChoice, useProgrammePrivacy } from "@/components/headcount-choice";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useProgramme } from "@/hooks/use-programme";
import { type Programme, normaliseCode } from "@/lib/programme";
import { clearPendingCode, clearProgramme, lookupProgramme, saveProgramme, setCounted, setFigures } from "@/lib/programme-membership";
import { stopOwnCopy } from "@/lib/workspace-client";
import { clearWorkspacePrefs } from "@/lib/workspace-prefs";

type Note = { kind: "ok" | "error"; text: string } | null;

/**
 * Where a programme code is entered and a programme is left, in Settings, and where
 * the choice to be counted in its anonymous monthly total is made or taken back.
 *
 * Joining checks the code with the server and then keeps the organisation's name and
 * contacts in this browser (see `lib/programme.ts`). If the organisation offers the
 * monthly headcount, the person is first shown what it means and the unticked box, so
 * the choice is made with the information in front of them; a programme that does not
 * offer it joins at once, as before. Leaving removes the programme and tells nobody,
 * because nobody was told when the person joined. A save the browser refuses is
 * reported, not swallowed.
 */
export function ProgrammeEditor({ userId }: { userId: string }) {
  const t = useT();
  const { getIdToken } = useAuth();
  const privacy = useProgrammePrivacy();
  const [programme, setProgramme, counted, figures] = useProgramme(userId);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  /** A programme found by its code that offers the headcount, waiting for the person's yes or no to joining and to being counted. */
  const [offered, setOffered] = useState<Programme | null>(null);
  const [wantsCount, setWantsCount] = useState(false);
  const [wantsFigures, setWantsFigures] = useState(false);

  const finishJoin = (found: Programme, withCount: boolean, withFigures: boolean) => {
    if (saveProgramme(userId, found, { counted: withCount, figures: withFigures })) {
      clearPendingCode();
      setProgramme(found);
      setCode("");
      setOffered(null);
      setWantsCount(false);
      setWantsFigures(false);
      setNote({ kind: "ok", text: t("programme.joinedOk", { name: found.name }) });
    } else {
      setNote({ kind: "error", text: t("programme.errStore") });
    }
  };

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setNote(null);
    setOffered(null);
    if (!normaliseCode(code)) {
      setNote({ kind: "error", text: t("programme.notFound") });
      return;
    }
    setBusy(true);
    const result = await lookupProgramme(code);
    setBusy(false);
    if (!result.ok) {
      setNote({ kind: "error", text: t(result.reason === "busy" || result.reason === "network" ? "programme.checkFailed" : "programme.notFound") });
      return;
    }
    if (result.programme.headcount) {
      setWantsCount(false);
      setWantsFigures(false);
      setOffered(result.programme);
    } else {
      finishJoin(result.programme, false, false);
    }
  };

  const leave = async () => {
    // Leaving also stops sharing with the programme's team, which deletes the copy they hold. If that
    // cannot be done now the person has not left yet and is told, so they never believe they have
    // left while the team still holds a copy.
    if (programme?.workspace && !(await stopOwnCopy(await getIdToken(), programme.code))) {
      setNote({ kind: "error", text: t("workspace.leaveFailed") });
      return;
    }
    if (programme) clearWorkspacePrefs(userId, programme.code);
    clearProgramme(userId);
    clearPendingCode();
    setProgramme(null);
    setOffered(null);
    setNote({ kind: "ok", text: t("programme.left") });
  };

  const changeCount = (next: boolean) => {
    setNote(null);
    if (!setCounted(userId, next)) setNote({ kind: "error", text: t("programme.errStore") });
  };

  const changeFigures = (next: boolean) => {
    setNote(null);
    if (!setFigures(userId, next)) setNote({ kind: "error", text: t("programme.errStore") });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("programme.title")}
        </CardTitle>
        <CardDescription>{t("programme.intro")}</CardDescription>
      </CardHeader>
      <CardContent>
        {programme ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{programme.name}</p>
            <p className="text-xs leading-relaxed text-subtle">{privacy(programme)}</p>
            <HeadcountChoice programme={programme} checked={counted} onChange={changeCount} figures={figures} onFiguresChange={changeFigures} />
            <Button type="button" variant="outline" onClick={leave}>
              {t("programme.leave")}
            </Button>
          </div>
        ) : offered ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t("programme.joinPrompt", { name: offered.name })}</p>
            <p className="text-xs leading-relaxed text-subtle">{privacy(offered)}</p>
            <HeadcountChoice
              programme={offered}
              checked={wantsCount}
              onChange={(next) => {
                setWantsCount(next);
                if (!next) setWantsFigures(false);
              }}
              figures={wantsFigures}
              onFiguresChange={setWantsFigures}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => finishJoin(offered, wantsCount, wantsFigures)}>
                {t("programme.join")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOffered(null)}>
                {t("programme.notNow")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={lookup} className="space-y-3" noValidate>
            <div className="space-y-2">
              <Label htmlFor="programme-code">{t("programme.title")}</Label>
              <Input
                id="programme-code"
                value={code}
                maxLength={24}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="uppercase tracking-wider"
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy || code.trim() === ""}>
              {t("programme.join")}
            </Button>
          </form>
        )}

        {note && (
          <p
            role={note.kind === "error" ? "alert" : "status"}
            className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
              note.kind === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300"
            }`}
          >
            {note.kind === "ok" ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            {note.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
