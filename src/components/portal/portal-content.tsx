"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import { ContentForm } from "@/components/portal/content-form";
import { PlansPanel } from "@/components/portal/plans-panel";
import { ProgrammeCard } from "@/components/portal/programme-card";
import { SecretNotice } from "@/components/portal/secret-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KIND_LABELS, ORG_KINDS, PLANS, planAllows } from "@/lib/billing/catalogue";
import { useAuth } from "@/hooks/use-auth";
import { type Prices, confirmCheckout, createOrg, createProgramme, getOverview, getPrices, makeRollupKey, openBillingPortal, privateLink, setEmailReports } from "@/lib/org/client";
import type { PortalOverview } from "@/lib/org/model";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; overview: PortalOverview | null };
type Banner = { tone: "ok" | "error"; text: string };

const LINK = "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SELECT_CLASS = "flex h-11 w-full rounded-2xl border border-input bg-surface-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const date = (ms: number | null) => (ms === null ? "an unknown date" : format(new Date(ms), "d MMM yyyy"));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The organisation portal: make the organisation, choose and pay for a plan, then make programmes (each with its own
 * code, words, poster and anonymous counts) and read the private links. Everything past the plan is closed until a plan
 * is active; the server checks that on every call, so closing a screen here is a courtesy, not the protection.
 * English only, like the rest of the pages for organisations.
 */
export function PortalContent() {
  const { getIdToken } = useAuth();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [prices, setPrices] = useState<Prices>({});
  const [banner, setBanner] = useState<Banner | null>(null);
  const [adding, setAdding] = useState(false);
  const [secret, setSecret] = useState<{ title: string; link: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const origin = useRef("https://recoverly.co.in");
  const started = useRef(false);

  const reload = useCallback(async () => {
    const result = await getOverview(await getIdToken());
    setLoad(result.ok ? { status: "ready", overview: result.data.overview } : { status: "error", message: result.message });
  }, [getIdToken]);

  // Load once, and handle the return from Stripe's page (`?checkout=success&session_id=…`).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    origin.current = window.location.origin;
    void getPrices().then(setPrices);
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      const sessionId = params.get("session_id");
      if (checkout) window.history.replaceState(null, "", "/portal");
      if (checkout === "cancelled") setBanner({ tone: "ok", text: "No payment was taken. You can choose a plan whenever you are ready." });
      if (checkout === "success" && sessionId) {
        setBanner({ tone: "ok", text: "Thank you. Checking your payment…" });
        // The payment provider confirms on its side too; ask a few times in case that is a moment behind.
        for (let attempt = 0; attempt < 4; attempt++) {
          const result = await confirmCheckout(await getIdToken(), sessionId);
          if (result.ok && result.data.access.active) {
            setBanner({ tone: "ok", text: "Payment received. Your plan is active." });
            break;
          }
          if (!result.ok && result.status !== 503) {
            setBanner({ tone: "error", text: `${result.message} If you were charged, contact us and we will put it right.` });
            break;
          }
          if (attempt === 3) setBanner({ tone: "ok", text: "We have your payment. It can take a minute to show here: refresh this page shortly." });
          else await sleep(2000);
        }
      }
      await reload();
    })();
  }, [getIdToken, reload]);

  if (load.status === "loading") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your organisation…
      </p>
    );
  }
  if (load.status === "error") {
    return (
      <div role="alert" className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm">
        <p>{load.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
          Try again
        </Button>
      </div>
    );
  }

  const overview = load.overview;
  if (!overview) return <OrgSetup getToken={getIdToken} onDone={reload} />;

  const { access, org } = overview;
  const plan = access.active ? access.plan : null;
  const programmeLimit = overview.programmeLimit;
  const canAdd = access.active && (programmeLimit === null || overview.programmes.length < programmeLimit);

  const manage = async () => {
    setBusy(true);
    const result = await openBillingPortal(await getIdToken());
    if (result.ok) {
      window.location.assign(result.data.url);
      return;
    }
    setBusy(false);
    setBanner({ tone: "error", text: result.message });
  };

  const toggleEmailReports = async (on: boolean) => {
    const result = await setEmailReports(await getIdToken(), on);
    if (!result.ok) return setBanner({ tone: "error", text: result.details[0] ?? result.message });
    setBanner({ tone: "ok", text: on ? "Done. You will be emailed last month's figures on the 2nd of each month." : "Done. The monthly email is off." });
    await reload();
  };

  const rollup = async () => {
    const result = await makeRollupKey(await getIdToken());
    if (!result.ok) return setBanner({ tone: "error", text: result.message });
    setSecret({ title: "Your private roll-up link", link: privateLink(origin.current, "group", result.data.rollupKey), note: "It adds up all your programmes. A programme counts toward a month only if 20 or more people in it are counted. Save it now: it is shown once and a new one replaces it." });
    await reload();
  };

  return (
    <div className="space-y-8">
      {banner && (
        <p role={banner.tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${banner.tone === "error" ? "border border-red-500/30 bg-red-500/5" : "border border-emerald-500/30 bg-emerald-500/5"}`}>
          {banner.text}
        </p>
      )}

      <section aria-labelledby="plan-heading" className="space-y-3">
        <h2 id="plan-heading" className="text-xl font-semibold">
          {org.name}
        </h2>
        <p className="text-sm text-muted-foreground">{KIND_LABELS[org.kind]}</p>

        {access.active && access.plan ? (
          <Card>
            <CardContent className="space-y-2 py-5">
              <p className="font-medium">
                Plan: {PLANS[access.plan].name}{" "}
                <span className="ml-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">{access.inGrace ? "Payment late" : "Active"}</span>
              </p>
              {access.source === "manual" ? (
                <p className="text-sm text-body">Paid by invoice. Active until {date(access.periodEnd)}. To renew, contact us before then.</p>
              ) : access.cancelAtPeriodEnd ? (
                <p className="text-sm text-body">Set to end on {date(access.periodEnd)}. It will not renew. You can undo that in Manage billing.</p>
              ) : access.inGrace ? (
                <p className="text-sm text-body">The last payment did not go through. Everything keeps working for now; please update your card in Manage billing so it does not stop.</p>
              ) : (
                <p className="text-sm text-body">Renews on {date(access.periodEnd)}.</p>
              )}
              {access.source === "stripe" && (
                <Button type="button" variant="outline" size="sm" onClick={() => void manage()} disabled={busy}>
                  Manage billing
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {access.source === "stripe" ? "Change plan or cancel in Manage billing." : "To change or end this plan, contact us."} See the{" "}
                <Link href="/partners/refunds" className={LINK}>
                  cancellation and refund terms
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-body">
              {access.status === "none"
                ? "Choose a plan to open programme codes, posters, the monthly report and the rest of the toolkit. Recoverly stays free for individuals, always."
                : "Your plan is not active, so programmes and the toolkit are closed. Nothing has been deleted: they open again as soon as a plan is active."}
            </p>
            <PlansPanel overview={overview} prices={prices} getToken={getIdToken} part="all" />
          </div>
        )}
      </section>

      <section aria-labelledby="programmes-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="programmes-heading" className="text-xl font-semibold">
            Programmes
          </h2>
          {programmeLimit !== null && (
            <p className="text-sm text-muted-foreground">
              {overview.programmes.length} of {programmeLimit} codes used
            </p>
          )}
        </div>

        {!access.active && overview.programmes.length === 0 && <p className="text-sm text-muted-foreground">Once your plan is active you can make a programme code here for each site, depot, campus or district, with its own welcome and support contacts.</p>}

        {overview.programmes.map((programme) => (
          <ProgrammeCard key={programme.code} programme={programme} overview={overview} origin={origin.current} getToken={getIdToken} reload={reload} />
        ))}

        {adding ? (
          <Card>
            <CardContent className="py-5">
              <h3 className="mb-3 font-semibold">New programme</h3>
              <ContentForm
                referralsAllowed={planAllows(plan, "referrals")}
                submitLabel="Create the programme"
                onCancel={() => setAdding(false)}
                onSubmit={async (content) => {
                  const result = await createProgramme(await getIdToken(), content);
                  if (!result.ok) return result.details.length ? result.details : [result.message];
                  setAdding(false);
                  await reload();
                  return null;
                }}
              />
            </CardContent>
          </Card>
        ) : (
          canAdd && (
            <Button type="button" onClick={() => setAdding(true)}>
              Add a programme
            </Button>
          )
        )}
        {access.active && !canAdd && programmeLimit !== null && <p className="text-sm text-muted-foreground">You have used every code your plan covers. Delete one you no longer use, or move to a larger plan in Manage billing.</p>}
      </section>

      {access.active && planAllows(plan, "rollup") && (
        <section aria-labelledby="rollup-heading" className="space-y-3">
          <h2 id="rollup-heading" className="text-xl font-semibold">
            Roll-up across programmes
          </h2>
          <p className="text-sm leading-relaxed text-body">One private page that adds up all your programmes&rsquo; monthly figures (for a network of districts). Each programme still follows the 20-person rule on its own.</p>
          <Button type="button" variant="outline" onClick={() => void rollup()}>
            {org.rollupOn ? "Make a new roll-up link" : "Make my roll-up link"}
          </Button>
          {secret && <SecretNotice title={secret.title} link={secret.link} note={secret.note} onDone={() => setSecret(null)} />}
        </section>
      )}

      {access.active && (
        <section aria-labelledby="services-heading" className="space-y-3">
          <h2 id="services-heading" className="text-xl font-semibold">
            Services
          </h2>
          <PlansPanel overview={overview} prices={prices} getToken={getIdToken} part="services" />
        </section>
      )}

      <section aria-labelledby="account-heading" className="space-y-2 text-sm text-body">
        <h2 id="account-heading" className="text-xl font-semibold text-foreground">
          Your organisation
        </h2>
        <p>
          Terms accepted: version {org.termsVersion}.{" "}
          <Link href="/partners/terms" className={LINK}>
            Read the organisation terms
          </Link>
          .
        </p>
        <p>{org.contactEmail ? `Receipts and notices go to ${org.contactEmail}, the confirmed address on your sign-in.` : "Your sign-in has no confirmed email address. Confirm it in Settings so we can send receipts."}</p>
        {access.active && planAllows(plan, "emailReports") && (
          <div className="flex gap-2 pt-1">
            <input id="email-reports" type="checkbox" checked={org.emailReports} disabled={!org.contactEmail && !org.emailReports} onChange={(e) => void toggleEmailReports(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-emerald-600" />
            <div>
              <Label htmlFor="email-reports" className="font-normal">
                Email me last month&rsquo;s figures on the 2nd of each month
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {org.contactEmail ? `Sent to ${org.contactEmail}.` : "Needs a confirmed email address on your sign-in, and yours is not confirmed yet. Confirm it in Settings."} The same anonymous numbers as the report page (rounded, and only at 20 or more people), for each programme whose report is
                on. Switch it off here at any time.
              </p>
            </div>
          </div>
        )}
        {org.purchases.length > 0 && <p>One-off purchases: {org.purchases.map((p) => `${p.item} on ${date(p.at)}`).join("; ")}.</p>}
        <p className="text-muted-foreground">To change the kind of organisation, close it, or have its data deleted, contact us on the organisations page.</p>
      </section>
    </div>
  );
}

function OrgSetup({ getToken, onDone }: { getToken: () => Promise<string | null>; onDone: () => Promise<void> }) {
  const id = useId();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await createOrg(await getToken(), { name, kind, acceptTerms: terms });
    setBusy(false);
    if (!result.ok) return setError(result.details[0] ?? result.message);
    await onDone();
  };

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <h2 className="text-xl font-semibold">Set up your organisation</h2>
        <p className="text-sm leading-relaxed text-body">
          This attaches an organisation to the Recoverly sign-in you are using now, so use an account you can hand over to a colleague if you leave. Making the organisation is free; you choose and pay for a plan next.
        </p>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>Organisation name</Label>
            <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="organization" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-kind`}>What kind of organisation is it?</Label>
            <select id={`${id}-kind`} value={kind} onChange={(e) => setKind(e.target.value)} className={SELECT_CLASS}>
              <option value="">Choose one</option>
              {ORG_KINDS.map((value) => (
                <option key={value} value={value}>
                  {KIND_LABELS[value]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">This decides which plans fit and what we can switch on. We check it before anything that shares individual information is allowed.</p>
          </div>
          <div className="flex gap-2">
            <input id={`${id}-terms`} type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-input accent-emerald-600" />
            <Label htmlFor={`${id}-terms`} className="font-normal leading-relaxed">
              I am authorised to act for this organisation and I accept the{" "}
              <Link href="/partners/terms" className={LINK} target="_blank">
                organisation terms
              </Link>
              .
            </Label>
          </div>
          {error && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Create the organisation
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
