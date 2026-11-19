"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { KIND_LABELS, PLANS, plansForKind } from "@/lib/billing/catalogue";
import type { OwnerOrgRow, ProgrammeSummary } from "@/lib/org/model";
import type { ProgrammeContent } from "@/lib/programme";

type Overview = { orgs: OwnerOrgRow[]; pending: ProgrammeSummary[]; rejected: ProgrammeSummary[] };
type State = { status: "loading" } | { status: "closed" } | { status: "error"; message: string } | { status: "ready"; overview: Overview };

const SELECT_CLASS = "flex h-11 w-full rounded-2xl border border-input bg-surface-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const when = (ms: number | null) => (ms === null ? "no end date" : format(new Date(ms), "d MMM yyyy"));

/** The words an organisation submitted, laid out so the owner can check every number and link before anyone sees it. */
function Words({ title, content }: { title: string; content: ProgrammeContent | null }) {
  if (!content) return <p className="text-sm text-muted-foreground">{title}: nothing is live yet.</p>;
  return (
    <div className="space-y-1 rounded-xl border border-border p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="font-medium">{content.name}</p>
      {Object.entries(content.welcome).map(([locale, text]) => (
        <p key={locale} className="leading-relaxed">
          <span className="mr-1 font-mono text-xs text-muted-foreground">{locale}</span>
          {text}
        </p>
      ))}
      <ul className="list-disc space-y-0.5 pl-5">
        {content.contacts.map((contact, index) => (
          <li key={index}>
            <span className="font-medium">{contact.label}</span>
            {contact.phone && <> · phone <span className="font-mono">{contact.phone}</span></>}
            {contact.email && <> · {contact.email}</>}
            {contact.url && <> · <span className="break-all">{contact.url}</span></>}
            {contact.hours && <> · {contact.hours}</>}
          </li>
        ))}
        {content.contacts.length === 0 && <li className="text-muted-foreground">No contacts.</li>}
      </ul>
      {content.referrals && content.referrals.length > 0 && (
        <div>
          <p className="font-medium">Referrals</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {content.referrals.map((referral, index) => (
              <li key={index}>
                <span className="font-medium">{referral.name}</span>
                {referral.place && <> · {referral.place}</>}
                {referral.phone && <> · phone <span className="font-mono">{referral.phone}</span></>}
                {referral.url && <> · <span className="break-all">{referral.url}</span></>}
                {referral.hours && <> · {referral.hours}</>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {content.plans && <p>Plans: {content.plans.map((p) => `when ${p.when}, then ${p.then}`).join("; ")}</p>}
      {content.questions && <p>Questions: {content.questions.join(" / ")}</p>}
    </div>
  );
}

/**
 * The owner's page: approve or reject what organisations write for their people (the guard against a stranger's number
 * reaching someone looking for help), confirm what kind of organisation each is, and switch a manually invoiced plan on or
 * off. The server answers 404 to anyone who is not on the owner list, so this page is empty for them.
 */
export function OwnerContent() {
  const { user, getIdToken } = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });
  const [message, setMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const started = useRef(false);

  const call = useCallback(
    async (method: string, path: string, body?: unknown) => {
      const token = await getIdToken();
      const response = await fetch(path, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: response.ok, status: response.status, data };
    },
    [getIdToken]
  );

  const reload = useCallback(async () => {
    const result = await call("GET", "/api/owner");
    if (result.status === 404) return setState({ status: "closed" });
    if (!result.ok) return setState({ status: "error", message: "Could not load. Try again." });
    setState({ status: "ready", overview: result.data as unknown as Overview });
  }, [call]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void reload();
  }, [reload]);

  const act = async (path: string, body: unknown) => {
    setMessage(null);
    const result = await call("POST", path, body);
    setMessage(result.ok ? "Done." : String(result.data.message ?? "That did not work."));
    await reload();
  };

  if (state.status === "loading") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
      </p>
    );
  }
  if (state.status === "closed") {
    return (
      <div className="space-y-2 text-sm leading-relaxed text-body">
        <p>This page is only for the owner of Recoverly.</p>
        {user && (
          <p className="text-muted-foreground">
            If that is you, add this sign-in id to <span className="font-mono">OWNER_UIDS</span> in Vercel, then redeploy: <span className="break-all font-mono text-foreground">{user.uid}</span>
          </p>
        )}
      </div>
    );
  }
  if (state.status === "error") return <p role="alert" className="text-sm">{state.message}</p>;

  const { orgs, pending, rejected } = state.overview;

  return (
    <div className="space-y-10">
      {message && (
        <p role="status" className="rounded-xl border border-border px-4 py-2 text-sm">
          {message}
        </p>
      )}

      <section aria-labelledby="review" className="space-y-3">
        <h2 id="review" className="text-xl font-semibold">
          Waiting for review ({pending.length})
        </h2>
        <p className="text-sm text-muted-foreground">Check every phone number, email and link: is it really this organisation&rsquo;s? Nothing is shown to people until you approve it.</p>
        {pending.length === 0 && <p className="text-sm">Nothing is waiting.</p>}
        {pending.map((item) => (
          <Card key={item.code}>
            <CardContent className="space-y-3 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{item.orgName}</span>
                <Badge variant="outline">{KIND_LABELS[item.orgKind]}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
              </div>
              <Words title="Submitted" content={item.draft} />
              <Words title="Live now" content={item.live} />
              <div className="space-y-1">
                <Label htmlFor={`note-${item.code}`}>Reason (needed to reject; shown to the organisation)</Label>
                <Input id={`note-${item.code}`} value={notes[item.code] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [item.code]: e.target.value }))} maxLength={300} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void act("/api/owner/review", { code: item.code, decision: "approve" })}>
                  Approve
                </Button>
                <Button type="button" variant="outline" onClick={() => void act("/api/owner/review", { code: item.code, decision: "reject", note: notes[item.code] ?? "" })}>
                  Reject
                </Button>
                {item.live && (
                  <Button type="button" variant="destructive" onClick={() => void act("/api/owner/review", { code: item.code, decision: "unpublish", note: notes[item.code] ?? "" })}>
                    Take down what is live
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {rejected.length > 0 && (
          <details className="rounded-xl border border-border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Sent back for changes ({rejected.length})</summary>
            <ul className="mt-2 space-y-1">
              {rejected.map((item) => (
                <li key={item.code}>
                  <span className="font-mono text-xs">{item.code}</span> {item.orgName}: {item.reviewNote ?? "no reason recorded"}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section aria-labelledby="orgs" className="space-y-3">
        <h2 id="orgs" className="text-xl font-semibold">
          Organisations ({orgs.length})
        </h2>
        {orgs.length === 0 && <p className="text-sm">No organisation has signed up yet.</p>}
        {orgs.map((org) => (
          <OrgCard key={org.id} org={org} act={act} />
        ))}
      </section>
    </div>
  );
}

function OrgCard({ org, act }: { org: OwnerOrgRow; act: (path: string, body: unknown) => Promise<void> }) {
  const id = useId();
  const fitting = plansForKind(org.kind);
  const [plan, setPlan] = useState<string>(fitting[0]?.id ?? "");
  const [endsOn, setEndsOn] = useState("");
  const [note, setNote] = useState("");
  const { access, subscription } = org;

  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{org.name}</span>
          <Badge variant="outline">{KIND_LABELS[org.kind]}</Badge>
          {org.kindVerified ? <Badge className="bg-emerald-600 text-white">Kind confirmed</Badge> : <Badge variant="secondary">Kind not confirmed</Badge>}
        </div>
        <p className="break-all font-mono text-xs text-muted-foreground">{org.id}</p>
        <p className="text-sm">
          {access.active ? (
            <>
              Plan <strong>{access.plan ? PLANS[access.plan].name : ""}</strong>, {subscription?.source === "manual" ? "manual" : "card"}, until {when(access.periodEnd)}
              {access.cancelAtPeriodEnd ? " (will not renew)" : ""}
              {access.inGrace ? " (payment late)" : ""}
            </>
          ) : (
            <>No active plan{subscription ? ` (last: ${subscription.plan}, ${subscription.status})` : ""}.</>
          )}
          {org.contactEmail ? ` · ${org.contactEmail}` : ""}
        </p>
        {subscription?.note && <p className="text-xs text-muted-foreground">Note: {subscription.note}</p>}
        {org.purchases.length > 0 && <p className="text-xs text-muted-foreground">Purchases: {org.purchases.map((p) => `${p.item} ${when(p.at)}`).join("; ")}</p>}

        <div className="flex flex-wrap gap-2">
          {org.kindVerified ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void act("/api/owner/org", { uid: org.id, action: "unverifyKind" })}>
              Un-confirm the kind
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => void act("/api/owner/org", { uid: org.id, action: "verifyKind" })}>
              Confirm the kind
            </Button>
          )}
          {subscription?.source === "manual" && access.active && (
            <Button type="button" variant="destructive" size="sm" onClick={() => void act("/api/owner/org", { uid: org.id, action: "deactivate" })}>
              End the manual plan
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Confirm a clinic or community service only after checking that it really is one. Never confirm an employer, a college or an insurer as one: that would let a team read individuals&rsquo; progress.</p>

        {!(subscription?.source === "stripe" && access.active) && (
          <form
            className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!plan || !endsOn) return;
              void act("/api/owner/org", { uid: org.id, action: "activate", plan, endsAt: `${endsOn}T23:59:59+05:30`, note });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor={`${id}-plan`}>Plan</Label>
              <select id={`${id}-plan`} value={plan} onChange={(e) => setPlan(e.target.value)} className={SELECT_CLASS}>
                {fitting.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-end`}>Active until</Label>
              <Input id={`${id}-end`} type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor={`${id}-note`}>Note (invoice number, how it was paid)</Label>
              <Input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" size="sm" disabled={!plan || !endsOn}>
                Switch the plan on by hand
              </Button>
              <span className="ml-2 text-xs text-muted-foreground">After the invoice or transfer has been paid. It ends on the date you give, by itself.</span>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
