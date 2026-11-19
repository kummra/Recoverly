import { NextRequest } from "next/server";

import { failure, json, readJson, requireUser, unavailable } from "@/lib/org/route";
import { orgService } from "@/lib/org/server";

export const runtime = "nodejs";

/**
 * The organisation portal's own record, for the signed-in owner: GET what the portal shows (`null` if there is no
 * organisation yet), POST to make one, PATCH to rename it. Nothing here is public; an organisation's words reach
 * its people only through the directory, after the owner has approved them.
 */
export async function GET(request: NextRequest) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const auth = await requireUser(request, "orgManage");
    if ("response" in auth) return auth.response;
    return json({ overview: await service.overview(auth.user.uid) });
  } catch (error) {
    return failure("GET /api/org", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const auth = await requireUser(request, "orgManage");
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, 2_000);
    if ("response" in parsed) return parsed.response;
    await service.createOrg(auth.user, { name: parsed.body.name, kind: parsed.body.kind, acceptTerms: parsed.body.acceptTerms });
    return json({ ok: true, overview: await service.overview(auth.user.uid) }, 201);
  } catch (error) {
    return failure("POST /api/org", error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const auth = await requireUser(request, "orgManage");
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, 2_000);
    if ("response" in parsed) return parsed.response;
    await service.rename(auth.user.uid, parsed.body.name);
    return json({ ok: true });
  } catch (error) {
    return failure("PATCH /api/org", error);
  }
}
