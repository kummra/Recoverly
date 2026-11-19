import { NextRequest } from "next/server";

import { failure, json, requireUser, unavailable } from "@/lib/org/route";
import { orgService } from "@/lib/org/server";

export const runtime = "nodejs";

/** Make (or replace) the private roll-up link across all of the organisation's programmes. The link is in the answer once and cannot be read back. */
export async function POST(request: NextRequest) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const auth = await requireUser(request, "orgManage");
    if ("response" in auth) return auth.response;
    return json(await service.rollupKey(auth.user.uid));
  } catch (error) {
    return failure("POST /api/org/rollup", error);
  }
}
