"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { ContentForm } from "@/components/portal/content-form";
import { SecretNotice } from "@/components/portal/secret-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { planAllows } from "@/lib/billing/catalogue";
import { type ApiResult, deleteProgramme, fetchLogoPreview, privateLink, removeLogo, rotateReportKey, setFeatures, setLogo, setWorkspaceKey, updateProgramme } from "@/lib/org/client";
import { prepareLogo } from "@/lib/org/logo-client";
import type { PortalOverview, PortalProgramme, ProgrammeFeatures } from "@/lib/org/model";
import { joinUrl, posterHref } from "@/lib/toolkit";
import { formatKeyId } from "@/lib/workspace";

type Message = { tone: "ok" | "error"; text: string };
type Secret = { title: string; link: string; note: string };

const NOTE = "text-xs leading-relaxed text-muted-foreground";
const CHECK = "mt-1 h-4 w-4 shrink-0 rounded border-input accent-emerald-600";

/** One programme in the portal: its words and review state, its join link and poster, the anonymous counts it offers, and (for a clinic) the team workspace. */
export function ProgrammeCard({ programme, overview, origin, getToken, reload }: { programme: PortalProgramme; overview: PortalOverview; origin: string; getToken: () => Promise<string | null>; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [secret, setSecret] = useState<Secret | null>(null);
  const [keyText, setKeyText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const plan = overview.access.active ? overview.access.plan : null;
  const can = (feature: Parameters<typeof planAllows>[1]) => planAllows(plan, feature);
  const { features } = programme;
  const name = programme.live?.name ?? programme.draft.name;

  /** Run one call with the person's sign-in; show a refusal in plain words, or refresh the portal on success. */
  async function run<T>(label: string, call: (token: string | null) => Promise<ApiResult<T>>): Promise<T | null> {
    setBusy(label);
    setMessage(null);
    const result = await call(await getToken());
    if (!result.ok) {
      setBusy(null);
      setMessage({ tone: "error", text: result.details.length ? result.details.join(" ") : result.message });
      return null;
    }
    await reload();
    setBusy(null);
    return result.data;
  }

  // The logo for the preview is fetched with the owner's sign-in, as a temporary address in this browser.
  const logoFlags = `${programme.logo.live}-${programme.logo.draft}-${programme.updatedAt}`;
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (programme.logo.live || programme.logo.draft) {
      void (async () => {
        const made = await fetchLogoPreview(await getToken(), `/api/org/programmes/${encodeURIComponent(programme.code)}/logo`);
        if (cancelled) {
          if (made) URL.revokeObjectURL(made);
          return;
        }
        url = made;
        setPreview(made);
      })();
    } else {
      setPreview(null);
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programme.code, logoFlags]);

  const chooseLogo = async (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    setBusy("logo");
    const prepared = await prepareLogo(file);
    if ("error" in prepared) {
      setBusy(null);
      setMessage({ tone: "error", text: prepared.error });
      return;
    }
    setBusy(null);
    await run("logo", (token) => setLogo(token, programme.code, prepared));
    if (fileInput.current) fileInput.current.value = "";
  };

  const toggle = async (feature: keyof ProgrammeFeatures, value: boolean) => {
    const data = await run(feature, (token) => setFeatures(token, programme.code, { [feature]: value }));
    if (data?.reportKey) {
      setSecret({
        title: "Your private report link",
        link: privateLink(origin, "report", data.reportKey),
        note: "Save it now: it is shown once and cannot be looked up again. Whoever has it can read this programme's monthly figures, nothing else. Your team workspace page, if you turn one on, is the same link with /workspace/ in place of /report/. If it is lost, make a new link and the old one stops working."
      });
    }
  };

  const newReportLink = async () => {
    const data = await run("rotate", (token) => rotateReportKey(token, programme.code));
    if (data) setSecret({ title: "Your new private report link", link: privateLink(origin, "report", data.reportKey), note: "The old link no longer works. Save this one now: it is shown once." });
  };

  const saveKey = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(keyText);
    } catch {
      setMessage({ tone: "error", text: "That is not the block of text your team's workspace page gave you. Paste all of it, from the first { to the last }." });
      return;
    }
    const data = await run("key", (token) => setWorkspaceKey(token, programme.code, parsed));
    if (data) {
      setKeyText("");
      setMessage({ tone: "ok", text: `Key saved. Its fingerprint is ${formatKeyId(data.keyId)}. Read it to your team so they can check it is theirs; people can share with the team from now on.` });
    }
  };

  const remove = async () => {
    await run("delete", (token) => deleteProgramme(token, programme.code));
  };

  const status =
    programme.reviewState === "approved" ? (
      <Badge className="bg-emerald-600 text-white">Live</Badge>
    ) : programme.reviewState === "rejected" ? (
      <Badge className="bg-red-600 text-white">Needs changes</Badge>
    ) : (
      <Badge variant="secondary">Waiting for review</Badge>
    );

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight">{name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Code <span className="font-mono text-foreground">{programme.code}</span>
            </p>
          </div>
          {status}
        </div>

        {programme.reviewState === "pending" && (
          <p className={NOTE}>{programme.live ? "Your new words are waiting for our review. People still see the last approved version." : "We are reading this programme. People cannot join it until it is approved, which usually takes a working day."}</p>
        )}
        {programme.reviewState === "rejected" && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm">
            {programme.reviewNote ?? "This programme needs changes."} {programme.live ? "People still see the last approved version." : "People cannot join it yet."} Edit the words and save to send it again.
          </p>
        )}
        {!overview.access.active && <p className={NOTE}>Your plan is not active, so this programme is paused: people cannot join it until the plan is renewed. Nothing has been deleted.</p>}

        {programme.live && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Join link:</span>
            <span className="break-all font-mono text-xs">{joinUrl(programme.code)}</span>
            <CopyButton text={joinUrl(programme.code)} label="Copy" />
            <Link href={posterHref({ org: name, code: programme.code, locale: "en", format: "poster" })} className="rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" target="_blank">
              Make a poster
            </Link>
          </div>
        )}

        {editing ? (
          <ContentForm
            initial={programme.draft}
            referralsAllowed={can("referrals")}
            submitLabel="Save and send for review"
            onCancel={() => setEditing(false)}
            onSubmit={async (content) => {
              const result = await updateProgramme(await getToken(), programme.code, content);
              if (!result.ok) return result.details.length ? result.details : [result.message];
              setEditing(false);
              await reload();
              return null;
            }}
          />
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)} disabled={!overview.access.active}>
            Edit the words
          </Button>
        )}

        {overview.access.active && can("logo") && (
          <div className="space-y-2 rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Your logo</p>
            <div className="flex flex-wrap items-center gap-3">
              {preview ? (
                // A temporary address in this browser, for the owner's own preview.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Your logo" className="h-14 w-14 rounded-lg border border-border bg-white object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No logo yet.</span>
              )}
              <div className="space-y-1">
                <Label htmlFor={`${programme.code}-logo`} className="sr-only">
                  Choose a logo picture
                </Label>
                <input
                  id={`${programme.code}-logo`}
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={busy !== null}
                  onChange={(event) => void chooseLogo(event.target.files?.[0])}
                  className="block text-xs file:mr-3 file:rounded-xl file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
                />
                {(programme.logo.live || programme.logo.draft) && (
                  <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => void run("logo", (token) => removeLogo(token, programme.code))}>
                    Remove the logo
                  </Button>
                )}
              </div>
            </div>
            <p className={NOTE}>
              A PNG or JPEG picture of your own logo, shrunk to a small size here. People see it beside your name on their dashboard, served from Recoverly so nobody else learns who looked. We look at every new logo before it is shown, to make sure it
              really is yours.
              {programme.logo.draft && " Your new logo is waiting for that review."}
            </p>
          </div>
        )}

        {overview.access.active && (
          <fieldset className="space-y-3 rounded-xl border border-border p-4" disabled={busy !== null}>
            <legend className="px-1 text-sm font-medium">What this programme offers its people</legend>
            <p className={NOTE}>Each is a choice the person makes themselves, off until they tick it. None of it shows you who they are.</p>

            <div className="flex gap-2">
              <input id={`${programme.code}-headcount`} type="checkbox" className={CHECK} checked={features.headcount} onChange={(e) => void toggle("headcount", e.target.checked)} />
              <div>
                <Label htmlFor={`${programme.code}-headcount`}>Monthly report: an anonymous headcount</Label>
                <p className={NOTE}>One number a month: how many people used Recoverly, out of those who chose to be counted. Shown only at 20 or more, rounded to the nearest 5. No names, no list.</p>
              </div>
            </div>

            {features.headcount && (
              <div className="space-y-3 border-l-2 border-border pl-4">
                {can("figures") && (
                  <div className="flex gap-2">
                    <input id={`${programme.code}-figures`} type="checkbox" className={CHECK} checked={features.figures} onChange={(e) => void toggle("figures", e.target.checked)} />
                    <div>
                      <Label htmlFor={`${programme.code}-figures`}>Anonymous progress averages</Label>
                      <p className={NOTE}>Two numbers about last month, averaged across people who chose to share them. Shown only at 20 or more.</p>
                    </div>
                  </div>
                )}
                {can("challenge") && (
                  <div className="flex gap-2">
                    <input id={`${programme.code}-challenge`} type="checkbox" className={CHECK} checked={features.challenge} onChange={(e) => void toggle("challenge", e.target.checked)} />
                    <div>
                      <Label htmlFor={`${programme.code}-challenge`}>Dry-month challenge count</Label>
                      <p className={NOTE}>An optional challenge people can join. You see only how many are taking part, shown at 20 or more.</p>
                    </div>
                  </div>
                )}
                {can("pulse") && (
                  <div className="flex gap-2">
                    <input id={`${programme.code}-pulse`} type="checkbox" className={CHECK} checked={features.pulse} onChange={(e) => void toggle("pulse", e.target.checked)} />
                    <div>
                      <Label htmlFor={`${programme.code}-pulse`}>Monthly one-question survey</Label>
                      <p className={NOTE}>
                        One fixed question a month, the same for everyone and written by us: &ldquo;I feel I could ask for help with drinking without being judged&rdquo;, answered from 1 to 5 by people who choose to. You see only the share who agree and
                        the average, and only at 20 or more answers. You cannot change the question.
                      </p>
                    </div>
                  </div>
                )}
                {overview.workspaceEligible && can("workspace") && (
                  <div className="flex gap-2">
                    <input id={`${programme.code}-workspace`} type="checkbox" className={CHECK} checked={features.workspace} disabled={!overview.org.kindVerified && !features.workspace} onChange={(e) => void toggle("workspace", e.target.checked)} />
                    <div>
                      <Label htmlFor={`${programme.code}-workspace`}>Private team workspace</Label>
                      <p className={NOTE}>
                        People who choose to can share their own progress with your team, by name, encrypted so only your team can read it. For clinics and community services only.
                        {!overview.org.kindVerified && " We confirm your organisation before this can be switched on: contact us and we will check it."}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void newReportLink()}>
                    Make a new report link
                  </Button>
                  <span className={NOTE}>Your report link was shown once, when it was made. A new one replaces it.</span>
                </div>
              </div>
            )}

            {features.workspace && (
              <div className="space-y-2 border-l-2 border-border pl-4">
                <p className="text-sm font-medium">Your team&rsquo;s key</p>
                {programme.workspaceKeyId ? (
                  <p className="text-sm">
                    A key is on file. Fingerprint: <span className="font-mono">{formatKeyId(programme.workspaceKeyId)}</span>. Check it matches what your team sees on its workspace page.
                  </p>
                ) : (
                  <p className="text-sm">No key yet, so nobody can share until you add one.</p>
                )}
                <p className={NOTE}>
                  Open your team&rsquo;s workspace page (your report link with /workspace/ in place of /report/). It makes a key in your team&rsquo;s own browser, locked by a passphrase only your team knows, and gives you one block of text: the public
                  key. Paste it here. A key with a private part is refused. Never paste anything but that block.
                </p>
                <Label htmlFor={`${programme.code}-key`} className="sr-only">
                  The team&rsquo;s public key
                </Label>
                <Textarea id={`${programme.code}-key`} value={keyText} onChange={(e) => setKeyText(e.target.value)} rows={3} className="font-mono text-xs" placeholder='{"kty":"RSA", ...}' />
                <Button type="button" size="sm" variant="outline" onClick={() => void saveKey()} disabled={!keyText.trim()}>
                  {programme.workspaceKeyId ? "Replace the key" : "Save the key"}
                </Button>
              </div>
            )}
          </fieldset>
        )}

        {busy && (
          <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Working…
          </p>
        )}
        {secret && <SecretNotice title={secret.title} link={secret.link} note={secret.note} onDone={() => setSecret(null)} />}
        {message && (
          <p role={message.tone === "error" ? "alert" : "status"} className={`rounded-xl px-3 py-2 text-sm ${message.tone === "error" ? "border border-red-500/30 bg-red-500/5" : "border border-emerald-500/30 bg-emerald-500/5"}`}>
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {confirmDelete ? (
            <>
              <span className="text-sm">Delete this programme? Its code stops working and its counts are no longer reachable.</span>
              <Button type="button" variant="destructive" size="sm" onClick={() => void remove()} disabled={busy !== null}>
                Yes, delete
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete this programme
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
