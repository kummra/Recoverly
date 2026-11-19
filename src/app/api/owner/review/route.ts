import { NextRequest } from "next/server";

import { failure, json, readJson, requireUser, unavailable } from "@/lib/org/route";
import { orgService } from "@/lib/org/server";
import { normaliseCode } from "@/lib/programme";

export const runtime = "nodejs";

const DECISIONS = ["approve", "reject", "unpublish"] as const;

/** `{ code, decision: "approve" | "reject" | "unpublish", note }`. Owner only. Nothing an organisation writes reaches its people until it is approved here. */
export async function POST(request: NextRequest) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const auth = await requireUser(request, "ownerManage", { owner: true });
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, 2_000);
    if ("response" in parsed) return parsed.response;
    const code = normaliseCode(parsed.body.code);
    const decision = DECISIONS.find((d) => d === parsed.body.decision);
    if (!code || !decision) return json({ error: "invalid" }, 400);
    await service.reviewProgramme(code, decision, parsed.body.note);
    return json({ ok: true });
  } catch (error) {
    return failure("POST /api/owner/review", error);
  }
}
