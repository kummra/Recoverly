import { NextRequest } from "next/server";

import { failure, json, requireUser, unavailable } from "@/lib/org/route";
import { billingService } from "@/lib/org/server";

export const runtime = "nodejs";

/** The address of Stripe's own page for the card, invoices, switching plan and cancelling. */
export async function POST(request: NextRequest) {
  try {
    const billing = billingService();
    if (!billing) return unavailable();
    const auth = await requireUser(request, "billing");
    if ("response" in auth) return auth.response;
    return json(await billing.portal(auth.user.uid));
  } catch (error) {
    return failure("POST /api/billing/portal", error);
  }
}
