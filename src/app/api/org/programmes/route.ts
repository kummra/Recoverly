import { NextRequest } from "next/server";

import { failure, json, readJson, requireUser, unavailable } from "@/lib/org/route";
import { orgService } from "@/lib/org/server";

export const runtime = "nodejs";

/** Make a programme (a site, depot, campus or district) with its own code: `{ "content": { name, welcome, contacts, ... } }`. It waits for the owner's review before anyone is shown it. */
export async function POST(request: NextRequest) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const auth = await requireUser(request, "orgManage");
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, 40_000);
    if ("response" in parsed) return parsed.response;
    return json({ programme: await service.createProgramme(auth.user.uid, parsed.body.content) }, 201);
  } catch (error) {
    return failure("POST /api/org/programmes", error);
  }
}
