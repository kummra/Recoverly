import { NextRequest } from "next/server";

import { failure, json, requireUser, unavailable } from "@/lib/org/route";
import { orgService } from "@/lib/org/server";

export const runtime = "nodejs";

/** For the owner only (anyone else gets a plain 404): every organisation with its plan, and the programmes waiting for review. */
export async function GET(request: NextRequest) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const auth = await requireUser(request, "ownerManage", { owner: true });
    if ("response" in auth) return auth.response;
    return json(await service.ownerOverview());
  } catch (error) {
    return failure("GET /api/owner", error);
  }
}
