"use client";

import { useState } from "react";
import { AlertCircle, Building2, Check } from "lucide-react";

import { HeadcountChoice, useProgrammePrivacy } from "@/components/headcount-choice";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProgramme } from "@/hooks/use-programme";
import { type Programme, normaliseCode } from "@/lib/programme";
import { clearPendingCode, clearProgramme, lookupProgramme, saveProgramme, setCounted } from "@/lib/programme-membership";

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
  const privacy = useProgrammePrivacy();
  const [programme, setProgramme, counted] = useProgramme(userId);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  /** A programme found by its code that offers the headcount, waiting for the person's yes or no to joining and to being counted. */
  const [offered, setOffered] = useState<Programme | null>(null);
  const [wantsCount, setWantsCount] = useState(false);

  const finishJoin = (found: Programme, withCount: boolean) => {
    if (saveProgramme(userId, found, { counted: withCount })) {
      clearPendingCode();
      setProgramme(found);
      setCode("");
      setOffered(null);
      setWantsCount(false);
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
      setOffered(result.programme);
    } else {
      finishJoin(result.programme, false);
    }
  };

  const leave = () => {
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
            <HeadcountChoice programme={programme} checked={counted} onChange={changeCount} />
            <Button type="button" variant="outline" onClick={leave}>
              {t("programme.leave")}
            </Button>
          </div>
        ) : offered ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t("programme.joinPrompt", { name: offered.name })}</p>
            <p className="text-xs leading-relaxed text-subtle">{privacy(offered)}</p>
            <HeadcountChoice programme={offered} checked={wantsCount} onChange={setWantsCount} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => finishJoin(offered, wantsCount)}>
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
