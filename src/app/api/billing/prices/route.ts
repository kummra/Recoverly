import { NextResponse } from "next/server";

import { billingService } from "@/lib/org/server";

export const runtime = "nodejs";

/**
 * What each plan and service costs, as Stripe has it, for the organisation portal. Public (prices are on the pricing page),
 * answers `null` for one that is not set up, and is cached for a few minutes. Nothing about any organisation is in it.
 */
export async function GET() {
  const billing = billingService();
  const prices = billing ? await billing.prices() : {};
  return NextResponse.json({ prices }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
}
