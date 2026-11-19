"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FEATURE_LABELS, PRODUCTS } from "@/lib/billing/catalogue";
import { type Prices, startCheckout } from "@/lib/org/client";
import type { PortalOverview } from "@/lib/org/model";

const LINK = "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Only ever go to Stripe's own payment page. */
const isStripeAddress = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com"));
  } catch {
    return false;
  }
};

/**
 * The plans an organisation can choose, each with what it includes and its price from Stripe, and the one-off services.
 * Pressing a button goes to Stripe's own payment page: no card detail is typed here or reaches us. A plan or service whose
 * price is not set up says to ask us, and we send an invoice and switch the plan on when it is paid.
 */
export function PlansPanel({ overview, prices, getToken, showServices = true }: { overview: PortalOverview; prices: Prices; getToken: () => Promise<string | null>; showServices?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buy = async (key: string, item: { plan: string } | { product: string }) => {
    setBusy(key);
    setError(null);
    const result = await startCheckout(await getToken(), item);
    if (result.ok && isStripeAddress(result.data.url)) {
      window.location.assign(result.data.url);
      return;
    }
    setBusy(null);
    setError(result.ok ? "We could not start the payment. Please try again, or contact us." : result.message);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {overview.plans.map((plan) => {
          const price = prices[plan.id];
          const features = plan.features.filter((feature) => feature !== "workspace" || overview.workspaceEligible);
          return (
            <Card key={plan.id}>
              <CardContent className="space-y-3 py-5">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.audience}</p>
                </div>
                <p className="text-lg font-semibold">{price ? price.text : "Price on request"}</p>
                <p className="text-sm text-body">
                  Covers up to {plan.programmes} programme code{plan.programmes === 1 ? "" : "s"} (a site, depot, campus or district each).
                </p>
                <ul className="space-y-1 text-sm">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      <span>{FEATURE_LABELS[feature]}</span>
                    </li>
                  ))}
                </ul>
                {price ? (
                  <Button type="button" onClick={() => void buy(plan.id, { plan: plan.id })} disabled={busy !== null}>
                    {busy === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                    Subscribe with a card
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Online payment is not set up for this plan yet.{" "}
                    <Link href="/partners#enquire" className={LINK}>
                      Ask us for an invoice
                    </Link>
                    .
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Pay by invoice, bank transfer or UPI instead? Tell us on the{" "}
        <Link href="/partners#enquire" className={LINK}>
          organisations page
        </Link>
        . We switch your plan on when the payment arrives and it ends on the date we agree. See the{" "}
        <Link href="/partners/refunds" className={LINK}>
          cancellation and refund terms
        </Link>
        .
      </p>

      {showServices && (
        <div className="space-y-2">
          <h3 className="font-semibold">Services</h3>
          {PRODUCTS.map((product) => {
            const price = prices[product.id];
            return (
              <Card key={product.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                  {price ? (
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{price.text}</span>
                      <Button type="button" variant="outline" onClick={() => void buy(product.id, { product: product.id })} disabled={busy !== null}>
                        {busy === product.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                        Buy
                      </Button>
                    </div>
                  ) : (
                    <Link href="/partners#enquire" className={`${LINK} text-sm`}>
                      Ask us about it
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
