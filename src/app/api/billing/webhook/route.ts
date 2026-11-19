import { NextRequest, NextResponse } from "next/server";

import { parseEvent, verifyWebhookSignature } from "@/lib/billing/stripe";
import { billingService } from "@/lib/org/server";

export const runtime = "nodejs";

const MAX_BYTES = 1_000_000;
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Stripe's events (subscription created, changed, ended; a checkout completed). There is no sign-in: the proof is
 * Stripe's signature over the exact body, made with `STRIPE_WEBHOOK_SECRET` and checked here before anything is read
 * (`lib/billing/stripe.ts`). A bad or stale signature is a 400 and changes nothing. A failure after that is a 500 so
 * Stripe sends the event again; each event is applied once (`lib/billing/service.ts`).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const billing = billingService();
  if (!secret || !billing) return reply({ error: "unavailable" }, 503);

  const payload = await request.text();
  if (payload.length > MAX_BYTES) return reply({ error: "too-large" }, 413);
  if (!verifyWebhookSignature(payload, request.headers.get("stripe-signature"), secret, Math.floor(Date.now() / 1000))) return reply({ error: "bad-signature" }, 400);
  const event = parseEvent(payload);
  if (!event) return reply({ error: "invalid" }, 400);

  try {
    return reply({ received: true, outcome: await billing.handleEvent(event) });
  } catch (error) {
    // The event type and the message only: never the body.
    // eslint-disable-next-line no-console
    console.error("[POST /api/billing/webhook]", event.type, error instanceof Error ? error.message : "unknown error");
    return reply({ error: "unavailable" }, 500);
  }
}
