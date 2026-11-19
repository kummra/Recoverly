import { NextRequest } from "next/server";

import { failure, imageResponse, json, requireUser, unavailable } from "@/lib/org/route";
import { orgService } from "@/lib/org/server";
import { normaliseCode } from "@/lib/programme";

export const runtime = "nodejs";

/** For the owner only: a programme's logo (`?code=…&which=draft|live`) so it can be looked at before it is approved. The answer is a picture. */
export async function GET(request: NextRequest) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const auth = await requireUser(request, "ownerManage", { owner: true });
    if ("response" in auth) return auth.response;
    const code = normaliseCode(request.nextUrl.searchParams.get("code"));
    const logo = code ? await service.ownerReadLogo(code, request.nextUrl.searchParams.get("which") === "live" ? "live" : "draft") : null;
    return logo ? imageResponse(logo, "no-store") : json({ error: "not_found" }, 404);
  } catch (error) {
    return failure("GET /api/owner/logo", error);
  }
}
