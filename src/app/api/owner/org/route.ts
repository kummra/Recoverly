import { NextRequest } from "next/server";

import { failure, json, readJson, requireUser, unavailable } from "@/lib/org/route";
import { orgService } from "@/lib/org/server";

export const runtime = "nodejs";

const ACTIONS = ["verifyKind", "unverifyKind", "activate", "deactivate"] as const;

/**
 * Owner only. `{ uid, action }` where the action is `verifyKind` or `unverifyKind` (confirm that an organisation really is a clinic or
 * community service, which the team workspace waits for), or `activate` (with `plan`, `endsAt`, `note`: switch a plan on by hand after
 * an invoice or bank transfer has been paid) or `deactivate` (end a manual activation).
 */
export async function POST(request: NextRequest) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const auth = await requireUser(request, "ownerManage", { owner: true });
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, 2_000);
    if ("response" in parsed) return parsed.response;
    const { uid, action } = parsed.body;
    if (typeof uid !== "string" || !uid || uid.length > 128 || !ACTIONS.some((a) => a === action)) return json({ error: "invalid" }, 400);

    if (action === "verifyKind") await service.setKindVerified(uid, true);
    else if (action === "unverifyKind") await service.setKindVerified(uid, false);
    else if (action === "activate") await service.activateManual(uid, { plan: parsed.body.plan, endsAt: parsed.body.endsAt, note: parsed.body.note });
    else await service.deactivateManual(uid);
    return json({ ok: true });
  } catch (error) {
    return failure("POST /api/owner/org", error);
  }
}
