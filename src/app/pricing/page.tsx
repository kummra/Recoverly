import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FEATURE_LABELS, PLANS, PLAN_IDS, PRODUCTS } from "@/lib/billing/catalogue";
import { billingService } from "@/lib/org/server";

const TITLE = "Plans and pricing for organisations";
const DESCRIPTION = "Recoverly is free for individuals, always. Clinics, employers, colleges and NGOs choose a plan for programme codes, the toolkit and anonymous reports. Pay by card or by invoice.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://recoverly.co.in/pricing" },
  openGraph: { title: `${TITLE} · Recoverly`, description: DESCRIPTION, url: "https://recoverly.co.in/pricing", siteName: "Recoverly", locale: "en_IN", type: "website" }
};

// Prices come from Stripe, so the page is rebuilt every ten minutes: a price changed there shows here without a deploy.
export const revalidate = 600;

const LINK = "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const NEVER = [
  "An employer, college or insurer never sees anything about an individual, on any plan, even if the person agrees. The software does not allow it.",
  "The private team workspace, where a person can choose to share their own progress by name, exists only for clinics and community services, and only after we have confirmed the organisation is one.",
  "Every anonymous count is off until the person ticks it, shows only at 20 people or more, and is rounded to the nearest 5. No names, no lists.",
  "No advertising and no selling of data, on any plan."
];

/**
 * What organisations pay for and what they do not. Prices are Stripe's and are shown only when they are set up there: a plan with no
 * price says "Ask us" rather than a number the code invented. Individuals pay for nothing, and the page says so first.
 */
export default async function PricingPage() {
  const billing = billingService();
  const prices: Record<string, { text: string } | null> = billing ? await billing.prices().catch(() => ({})) : {};

  return (
    <div lang="en" className="animate-fade-in-up mx-auto max-w-5xl space-y-10">
      <header className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Building2 className="h-4 w-4" aria-hidden />
          <Link href="/partners" className={LINK}>
            For organisations
          </Link>
        </p>
        <h1 className="text-3xl font-bold leading-tight">Plans and pricing</h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
          Recoverly is free for individuals, always: the app, the helplines, the guides and the safety documents never sit behind a payment. Organisations pay for the toolkit, programme codes and reports that sit beside it.
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Recoverly is a new product, so this page says only what exists today. If something you need is not here, <Link href="/partners#enquire" className={LINK}>tell us</Link>.
        </p>
      </header>

      <section aria-labelledby="plans" className="space-y-4">
        <h2 id="plans" className="text-xl font-semibold">
          Choose the plan that fits your organisation
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLAN_IDS.map((id) => {
            const plan = PLANS[id];
            const price = prices[id];
            return (
              <Card key={id}>
                <CardContent className="flex h-full flex-col space-y-4 py-6">
                  <div>
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.audience}</p>
                  </div>
                  <p className="text-2xl font-bold">{price ? price.text : "Ask us"}</p>
                  <p className="text-sm text-body">
                    Up to {plan.programmes} programme code{plan.programmes === 1 ? "" : "s"}: one for each site, depot, campus or district.
                  </p>
                  <ul className="flex-1 space-y-1.5 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        <span>{FEATURE_LABELS[feature]}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={id === "clinic" ? "default" : "outline"}>
                    <Link href="/portal">{price ? "Get started" : "Set up and ask for an invoice"}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Which plan fits is decided by the kind of organisation: a clinic or community service, an employer, fleet or college, or a network running many sites. The portal shows you the plans that apply to you.
        </p>
      </section>

      <section aria-labelledby="services" className="space-y-3">
        <h2 id="services" className="text-xl font-semibold">
          One-off services
        </h2>
        {PRODUCTS.map((product) => (
          <Card key={product.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>
              <p className="font-semibold">{prices[product.id]?.text ?? "Ask us"}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-labelledby="never" className="space-y-3">
        <h2 id="never" className="text-xl font-semibold">
          What no plan changes
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-body">
          {NEVER.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="paying" className="space-y-3">
        <h2 id="paying" className="text-xl font-semibold">
          How paying works
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-body">
          <li>
            You set up your organisation in the{" "}
            <Link href="/portal" className={LINK}>
              organisation portal
            </Link>{" "}
            (free), choose a plan, and pay on Stripe&rsquo;s own payment page. Your card details go to Stripe and never reach us.
          </li>
          <li>You can change plan, update your card, get invoices and cancel yourself, on Stripe&rsquo;s billing page, from the portal. A cancellation takes effect at the end of the period you have paid for.</li>
          <li>Prefer an invoice, a bank transfer or UPI? Ask on the organisations page. We switch your plan on when the payment arrives, for the period we agree.</li>
          <li>If a plan ends, your programme codes pause and your private pages close. Nothing is deleted, and it all opens again when you renew. People who already joined keep what is on their own devices.</li>
          <li>
            Read the{" "}
            <Link href="/partners/terms" className={LINK}>
              organisation terms
            </Link>{" "}
            and the{" "}
            <Link href="/partners/refunds" className={LINK}>
              cancellation and refund terms
            </Link>
            . Both are drafts that have not yet been reviewed by a lawyer; we say so on the pages.
          </li>
        </ul>
      </section>
    </div>
  );
}
