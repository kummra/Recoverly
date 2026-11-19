import { NextRequest } from "next/server";

import { failure, json, readJson, requireUser, unavailable } from "@/lib/org/route";
import { billingService } from "@/lib/org/server";

export const runtime = "nodejs";

/** The person is back from Stripe's page: ask Stripe about that exact session and apply it if it is complete and theirs. */
export async function POST(request: NextRequest) {
  try {
    const billing = billingService();
    if (!billing) return unavailable();
    const auth = await requireUser(request, "billing");
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, 1_000);
    if ("response" in parsed) return parsed.response;
    return json({ access: await billing.confirm(auth.user.uid, parsed.body.sessionId) });
  } catch (error) {
    return failure("POST /api/billing/confirm", error);
  }
}
