import { NextRequest } from "next/server";

import { failure, json, readJson, requireUser, unavailable } from "@/lib/org/route";
import { billingService } from "@/lib/org/server";

export const runtime = "nodejs";

/** Start a payment: `{ "plan": "clinic" }` for a subscription or `{ "product": "workshop" }` for a one-off service. The answer is the address of Stripe's own payment page; no card detail ever comes through here. */
export async function POST(request: NextRequest) {
  try {
    const billing = billingService();
    if (!billing) return unavailable();
    const auth = await requireUser(request, "billing");
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, 1_000);
    if ("response" in parsed) return parsed.response;
    return json(await billing.checkout(auth.user.uid, { plan: parsed.body.plan, product: parsed.body.product }));
  } catch (error) {
    return failure("POST /api/billing/checkout", error);
  }
}
