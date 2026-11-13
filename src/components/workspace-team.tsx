"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Check, Copy, Download, KeyRound, Lock, Printer, RefreshCw, ShieldCheck } from "lucide-react";

import { SnapshotArticle } from "@/components/snapshot-article";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONTACT_EMAIL } from "@/lib/contact";
import type { ShareSnapshot } from "@/lib/share";
import { WORKSPACE_LIMITS, cleanPublicKey, formatKeyId, publicKeyText } from "@/lib/workspace";
import { fetchInbox } from "@/lib/workspace-client";
import {
  MIN_PASSPHRASE_LENGTH,
  type ProtectedKey,
  generateWorkspaceKeys,
  keyIdOf,
  openFromWorkspace,
  protectPrivateKey,
  publicKeyOf,
  unlockPrivateKey,
  workspaceCryptoAvailable
} from "@/lib/workspace-crypto";
import { clearProtectedKey, keyFilePublicKey, keyFileText, loadProtectedKey, loadStoredPublicKey, parseKeyFile, saveProtectedKey, saveStoredPublicKey } from "@/lib/workspace-keystore";

const PANEL = "space-y-4 rounded-2xl border border-border bg-card p-6";
const NOTE = "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm";
const dateTime = (ms: number) => format(new Date(ms), "d MMM yyyy, h:mm a");
const DAY = 24 * 60 * 60 * 1000;

/**
 * An organisation's team workspace, at the private address only it has been given (the same
 * private link as its report): where the team makes its key, opens it, and reads what people have
 * chosen to share with it. See `lib/workspace.ts` for the whole design; in short:
 *
 *  - The team's private key is made here, in this browser, and locked with a passphrase the team
 *    chooses. It is never sent anywhere, and nobody (Recoverly included) can recover a forgotten
 *    passphrase. The team saves a key file so other browsers can open the workspace.
 *  - Only the matching PUBLIC key goes to Recoverly (by email, to be added to the register by the
 *    owner), which is what stops anyone who gets hold of this address from swapping in their own.
 *  - What people share arrives scrambled and is opened here, in the page, after the passphrase.
 *    Everything shown has been re-cleaned and is plain text.
 * English only, like the rest of the organisations' pages.
 */
export function WorkspaceTeam({ token, code, name, publicKey, keyId }: { token: string; code: string; name: string; publicKey: JsonWebKey | null; keyId: string | null }) {
  const [ready, setReady] = useState(false);
  /** The team's locked key in this browser, if it has one. */
  const [locked, setLocked] = useState<ProtectedKey | null>(null);
  /** The team's own public key, made here and waiting to be added to the register. */
  const [pending, setPending] = useState<JsonWebKey | null>(null);
  /** The unlocked private key. In this page's memory only, never stored: closing or locking the page forgets it. */
  const [privateKey, setPrivateKey] = useState<JsonWebKey | null>(null);

  useEffect(() => {
    setLocked(loadProtectedKey(code));
    setPending(loadStoredPublicKey(code));
    setReady(true);
  }, [code]);

  const startOver = () => {
    clearProtectedKey(code);
    setLocked(null);
    setPending(null);
    setPrivateKey(null);
  };

  let body;
  if (!ready) {
    body = <p role="status" className="text-sm text-muted-foreground">Loading…</p>;
  } else if (privateKey) {
    body = <Board token={token} name={name} privateKey={privateKey} onLock={() => setPrivateKey(null)} />;
  } else if (!publicKey) {
    body = locked && pending ? <AwaitingPanel code={code} name={name} locked={locked} publicKey={pending} onStartOver={startOver} /> : (
      <SetupPanel
        code={code}
        name={name}
        onMade={(blob, pub) => {
          setLocked(blob);
          setPending(pub);
        }}
      />
    );
  } else {
    body = <UnlockPanel code={code} name={name} registered={publicKey} registeredId={keyId} locked={locked} onUnlocked={setPrivateKey} onLoaded={setLocked} onStartOver={startOver} />;
  }

  return (
    <div lang="en" className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{name}: team workspace</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Private to {name}&apos;s team. People in your Recoverly programme who choose to can share their own progress with you here, under the name they give. It is scrambled on their device for your team&apos;s key, so Recoverly cannot read it.
        </p>
      </header>
      {body}
    </div>
  );
}

function SetupPanel({ code, name, onMade }: { code: string; name: string; onMade: (blob: ProtectedKey, publicKey: JsonWebKey) => void }) {
  const [passphrase, setPassphrase] = useState("");
  const [again, setAgain] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cryptoOk = workspaceCryptoAvailable();
  const long = passphrase.length >= MIN_PASSPHRASE_LENGTH;
  const same = passphrase === again;

  const make = async () => {
    if (busy || !long || !same || !understood) return;
    setBusy(true);
    setError(null);
    try {
      const { publicJwk, privateJwk } = await generateWorkspaceKeys();
      const blob = await protectPrivateKey(privateJwk, passphrase);
      if (!saveProtectedKey(code, blob) || !saveStoredPublicKey(code, publicJwk)) {
        setError("This browser would not keep the key (a private window can do this). Please use a normal window and try again.");
        return;
      }
      onMade(blob, publicJwk);
    } catch {
      setError("The key could not be made in this browser. Please use an up-to-date browser and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={PANEL} aria-labelledby="setup-title">
      <h2 id="setup-title" className="flex items-center gap-2 text-lg font-semibold">
        <KeyRound className="h-5 w-5" aria-hidden /> Make {name}&apos;s key
      </h2>
      <p className="text-sm leading-relaxed text-body">
        Your team needs one key to open what people share. It is made here, in this browser, and locked with a passphrase that only your team knows. It never leaves this browser unlocked, and Recoverly never has it.
      </p>
      <p className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
        If you forget the passphrase, and also lose the key file you will be asked to save, nobody can open what people have shared, Recoverly included. You would make a new key and people would have to share again. Use a password manager.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="ws-pass">Passphrase (at least {MIN_PASSPHRASE_LENGTH} characters)</Label>
        <Input id="ws-pass" type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ws-pass2">Passphrase again</Label>
        <Input id="ws-pass2" type="password" autoComplete="new-password" value={again} onChange={(event) => setAgain(event.target.value)} />
        {again !== "" && !same && <p className="text-xs text-red-700 dark:text-red-300">The two do not match.</p>}
      </div>
      <label className="flex items-start gap-2.5 text-sm leading-relaxed">
        <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />I understand that nobody can recover this passphrase for us.
      </label>
      {!cryptoOk && (
        <p role="alert" className={`${NOTE} bg-red-500/10 text-red-700 dark:text-red-300`}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          This browser cannot make the key. Please use an up-to-date browser.
        </p>
      )}
      {error && (
        <p role="alert" className={`${NOTE} bg-red-500/10 text-red-700 dark:text-red-300`}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <Button type="button" onClick={make} disabled={busy || !cryptoOk || !long || !same || !understood}>
        {busy ? "Making the key…" : "Make our key"}
      </Button>
    </section>
  );
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function AwaitingPanel({ code, name, locked, publicKey, onStartOver }: { code: string; name: string; locked: ProtectedKey; publicKey: JsonWebKey; onStartOver: () => void }) {
  const [id, setId] = useState<string | null>(null);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const [confirmReset, setConfirmReset] = useState(false);
  const text = JSON.stringify(cleanPublicKey(publicKey), null, 2);

  useEffect(() => {
    void keyIdOf(publicKey).then(setId);
  }, [publicKey]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <section className={PANEL} aria-labelledby="await-title">
      <h2 id="await-title" className="flex items-center gap-2 text-lg font-semibold">
        <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden /> Your key is made
      </h2>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-body">
        <li>
          <strong>Save your key file</strong> somewhere safe, such as your password manager. It is locked with your passphrase, and it is how other browsers and colleagues open this workspace.
          <div className="mt-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => download(`recoverly-team-key-${code}.json`, keyFileText(code, locked, publicKey))}>
              <Download className="h-4 w-4" aria-hidden /> Save key file
            </Button>
          </div>
        </li>
        <li>
          <strong>Email the public key below</strong> to{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Team workspace key for ${name}`)}`}>
            {CONTACT_EMAIL}
          </a>
          . It is public: it can only lock things, never open them. We add it so people in your programme can be offered the workspace, and read its ID back to you.
          <textarea readOnly value={text} rows={6} aria-label="Your team's public key" onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-3 py-2 font-mono text-xs" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copy}>
              {copied === "copied" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied === "copied" ? "Copied" : "Copy public key"}
            </Button>
            {copied === "failed" && <span className="text-xs text-red-700 dark:text-red-300">Could not copy. Select the text and copy it.</span>}
          </div>
        </li>
        <li>
          <strong>Check the key ID</strong> we read back to you. It should be{" "}
          <span className="font-mono font-semibold">{id ? formatKeyId(id) : "…"}</span>. If it is not, tell us at once and do not use the workspace.
        </li>
        <li>Come back to this page once we confirm. You will unlock it with your passphrase.</li>
      </ol>
      {confirmReset ? (
        <div className="space-y-2 rounded-xl border border-border p-3 text-sm">
          <p>This forgets the key in this browser. If you have not saved the key file you will need to make a new key. Continue?</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onStartOver}>
              Yes, start over
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
              No
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
          Start over with a new key
        </Button>
      )}
    </section>
  );
}

function UnlockPanel({
  code,
  name,
  registered,
  registeredId,
  locked,
  onUnlocked,
  onLoaded,
  onStartOver
}: {
  code: string;
  name: string;
  registered: JsonWebKey;
  registeredId: string | null;
  locked: ProtectedKey | null;
  onUnlocked: (privateKey: JsonWebKey) => void;
  onLoaded: (blob: ProtectedKey) => void;
  onStartOver: () => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !locked) return;
    setBusy(true);
    setError(null);
    const key = await unlockPrivateKey(locked, passphrase);
    setBusy(false);
    if (!key) {
      setError("That passphrase does not open this key.");
      return;
    }
    // Opens only if it is the key registered for this programme, so a key from somewhere else cannot be mistaken for ours.
    if (publicKeyOf(key) !== publicKeyText(registered)) {
      setError(`This key is not the one registered for ${name}. Use the key file you saved when you made ${name}'s key.`);
      return;
    }
    setPassphrase("");
    onUnlocked(key);
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    const text = file.size <= 20_000 ? await file.text() : "";
    const blob = parseKeyFile(text);
    if (!blob) {
      setError("That is not a key file from this workspace.");
      return;
    }
    if (!saveProtectedKey(code, blob)) {
      setError("This browser would not keep the key. Please use a normal window.");
      return;
    }
    const pub = keyFilePublicKey(text);
    if (pub) saveStoredPublicKey(code, pub);
    onLoaded(blob);
  };

  return (
    <section className={PANEL} aria-labelledby="unlock-title">
      <h2 id="unlock-title" className="flex items-center gap-2 text-lg font-semibold">
        <Lock className="h-5 w-5" aria-hidden /> Open the workspace
      </h2>
      {registeredId && (
        <p className="text-sm leading-relaxed text-body">
          The key registered for {name} has the ID <span className="font-mono font-semibold">{formatKeyId(registeredId)}</span>. People are shown this ID before they share, so it should be the one you were told.
        </p>
      )}
      {locked ? (
        <form onSubmit={unlock} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="ws-unlock">Passphrase</Label>
            <Input id="ws-unlock" type="password" autoComplete="current-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
          </div>
          <Button type="submit" disabled={busy || passphrase === ""}>
            {busy ? "Opening…" : "Open"}
          </Button>
        </form>
      ) : (
        <p className="text-sm leading-relaxed text-body">This browser does not have your team&apos;s key yet. Choose the key file you saved when the key was made.</p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="ws-file">{locked ? "Use a different key file" : "Key file"}</Label>
        <Input id="ws-file" type="file" accept="application/json,.json" onChange={importFile} />
      </div>
      {error && (
        <p role="alert" className={`${NOTE} bg-red-500/10 text-red-700 dark:text-red-300`}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <p className="text-xs leading-relaxed text-subtle">
        Lost both the passphrase and the key file? Nobody can recover them. Email {CONTACT_EMAIL} and we will register a new key; people will then need to share again.
      </p>
      {locked &&
        (confirmReset ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Forget the key in this browser?</span>
            <Button type="button" variant="outline" size="sm" onClick={onStartOver}>
              Yes
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
              No
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
            Forget the key in this browser
          </Button>
        ))}
    </section>
  );
}

type Entry = { id: string; snapshot: ShareSnapshot; updatedAt: number; expiresAt: number };
type Loaded = { entries: Entry[]; unreadable: number; loadedAt: number };
type BoardState = { status: "loading" } | { status: "error"; busy: boolean } | { status: "ready"; data: Loaded };

/** Fetch what people have shared, open it with the team's key, and show it. */
function Board({ token, name, privateKey, onLock }: { token: string; name: string; privateKey: JsonWebKey; onLock: () => void }) {
  const [state, setState] = useState<BoardState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    const inbox = await fetchInbox(token);
    if (!inbox.ok) {
      setState({ status: "error", busy: inbox.reason === "busy" });
      return;
    }
    const opened = await Promise.all(inbox.copies.map(async (copy) => ({ copy, snapshot: await openFromWorkspace(privateKey, { iv: copy.iv, ct: copy.ct, wk: copy.wk }) })));
    const entries: Entry[] = [];
    let unreadable = 0;
    for (const { copy, snapshot } of opened) {
      if (snapshot) entries.push({ id: copy.id, snapshot, updatedAt: copy.updatedAt, expiresAt: copy.expiresAt });
      else unreadable += 1;
    }
    setState({ status: "ready", data: { entries, unreadable, loadedAt: Date.now() } });
  }, [token, privateKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return <BoardView name={name} state={state} onRefresh={() => void load()} onLock={onLock} />;
}

/** What the team sees, from whatever has been opened. Also used, with invented people, for the public example. */
function BoardView({ name, state, onRefresh, onLock }: { name: string; state: BoardState; onRefresh?: () => void; onLock?: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = state.status === "ready" ? state.data.entries.find((entry) => entry.id === openId) : undefined;

  return (
    <div className="space-y-6">
      <p className={`${NOTE} bg-emerald-500/10 leading-relaxed text-emerald-800 dark:text-emerald-200`}>
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Everyone listed here chose to share this with {name}&apos;s team, under the name they gave, and can stop at any time. Use it only to support them. Never make sharing a condition of care, employment or cover, never pass it on, and remember that each copy ends {WORKSPACE_LIMITS.expiryDays} days after the person last sent it.
        </span>
      </p>

      {(onRefresh || onLock) && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {onRefresh && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
            </Button>
          )}
          {onLock && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onLock}>
              <Lock className="h-4 w-4" aria-hidden /> Lock
            </Button>
          )}
        </div>
      )}

      {state.status === "loading" && (
        <p role="status" className="text-sm text-muted-foreground">
          Opening what people have shared…
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className={`${NOTE} bg-red-500/10 text-red-700 dark:text-red-300`}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.busy ? "Too many requests just now. Please wait a little and refresh." : "Could not reach the workspace. Please try again in a little while."}
        </p>
      )}

      {state.status === "ready" && (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Counter label="Sharing with you now" value={state.data.entries.length} />
            <Counter label="Updated in the last 7 days" value={state.data.entries.filter((entry) => entry.updatedAt >= state.data.loadedAt - 7 * DAY).length} />
            <Counter label="Ending within 7 days" value={state.data.entries.filter((entry) => entry.expiresAt <= state.data.loadedAt + 7 * DAY).length} />
          </dl>
          {state.data.unreadable > 0 && (
            <p className="text-xs leading-relaxed text-subtle">
              {state.data.unreadable} {state.data.unreadable === 1 ? "copy" : "copies"} could not be opened with this key and {state.data.unreadable === 1 ? "is" : "are"} not shown.
            </p>
          )}

          {state.data.entries.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-sm leading-relaxed text-body">
              Nobody is sharing with you yet. People see the choice on their summary page, and only if they have joined your programme and decide to.
            </p>
          ) : (
            <ul className="space-y-2">
              {state.data.entries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  <span>
                    <span className="font-medium">{entry.snapshot.label ?? "No name given"}</span>
                    <span className="block text-xs text-subtle">
                      Updated {dateTime(entry.updatedAt)} · readable until {dateTime(entry.expiresAt)}
                    </span>
                  </span>
                  <Button type="button" variant={openId === entry.id ? "default" : "outline"} size="sm" aria-pressed={openId === entry.id} onClick={() => setOpenId(openId === entry.id ? null : entry.id)}>
                    {openId === entry.id ? "Close" : "Read"}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {open && (
            <div className="space-y-3">
              <div className="flex justify-end print:hidden">
                <Button type="button" className="gap-1.5" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" aria-hidden /> Print
                </Button>
              </div>
              <SnapshotArticle snapshot={open.snapshot} meta={`Updated ${dateTime(open.updatedAt)}. Readable until ${dateTime(open.expiresAt)}.`} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Invented people, for `/partners/workspace/example`: how the workspace looks, with nobody real in it. */
export function WorkspaceExample() {
  const [loadedAt] = useState(() => Date.now());
  const entries: Entry[] = [
    {
      id: "example-1",
      updatedAt: loadedAt - 1 * DAY,
      expiresAt: loadedAt + 29 * DAY,
      snapshot: {
        v: 1,
        createdAt: new Date(loadedAt - 1 * DAY).toISOString(),
        label: "Example person A",
        progress: { since: "2026-06-02", checkIns: 118, monthMl: 320, previousMonthMl: 1180, dailyAverageMl: 11, currentStreakDays: 9, longestStreakDays: 21, freeDaysThisMonth: 10, daysThisMonth: 13, weeklyGoalMl: 350 },
        cravings: { total: 14, passed: 11, avgIntensity: 2.6 },
        why: "To be there for my family"
      }
    },
    {
      id: "example-2",
      updatedAt: loadedAt - 5 * DAY,
      expiresAt: loadedAt + 25 * DAY,
      snapshot: {
        v: 1,
        createdAt: new Date(loadedAt - 5 * DAY).toISOString(),
        label: "Example person B",
        progress: { since: "2026-09-14", checkIns: 47, monthMl: 900, previousMonthMl: 1500, dailyAverageMl: 30, currentStreakDays: 3, longestStreakDays: 8, freeDaysThisMonth: 6, daysThisMonth: 13, weeklyGoalMl: null }
      }
    },
    {
      id: "example-3",
      updatedAt: loadedAt - 24 * DAY,
      expiresAt: loadedAt + 6 * DAY,
      snapshot: {
        v: 1,
        createdAt: new Date(loadedAt - 24 * DAY).toISOString(),
        progress: { since: "2026-10-01", checkIns: 22, monthMl: 1400, previousMonthMl: 1300, dailyAverageMl: 47, currentStreakDays: 0, longestStreakDays: 4, freeDaysThisMonth: 3, daysThisMonth: 13, weeklyGoalMl: 600 }
      }
    }
  ];
  return (
    <div lang="en" className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Example team workspace</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          This is how a clinic&apos;s team would see what people chose to share with it. The people here are invented. In the real workspace each summary is scrambled on the person&apos;s own device and can only be opened with your team&apos;s private key, which is made in your browser and never sent to us.
        </p>
      </header>
      <BoardView name="Example clinic" state={{ status: "ready", data: { entries, unreadable: 0, loadedAt } }} />
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
