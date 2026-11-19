import { NextRequest } from "next/server";

import { failure, json, readJson, requireUser, unavailable } from "@/lib/org/route";
import { orgService } from "@/lib/org/server";
import { normaliseCode } from "@/lib/programme";

export const runtime = "nodejs";

type Context = { params: Promise<{ code: string }> };

const notFound = () => json({ error: "not_found", message: "That programme was not found." }, 404);

/** Save new words as a draft (they wait for the owner's review; people keep seeing the last approved version). */
export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const code = normaliseCode((await params).code);
    if (!code) return notFound();
    const auth = await requireUser(request, "orgManage");
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, 40_000);
    if ("response" in parsed) return parsed.response;
    return json({ programme: await service.updateProgramme(auth.user.uid, code, parsed.body.content) });
  } catch (error) {
    return failure("PUT /api/org/programmes/[code]", error);
  }
}

/**
 * One change per request: `{ "features": { headcount, figures, challenge, workspace } }`, `{ "rotateReportKey": true }`
 * or `{ "workspaceKey": { ...the team's public key } }`. A private link's secret is in the answer only at the moment it is made.
 */
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const code = normaliseCode((await params).code);
    if (!code) return notFound();
    const auth = await requireUser(request, "orgManage");
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, 10_000);
    if ("response" in parsed) return parsed.response;
    const { features, rotateReportKey, workspaceKey } = parsed.body;

    if (typeof features === "object" && features !== null && !Array.isArray(features)) {
      return json(await service.setFeatures(auth.user.uid, code, features as Record<string, unknown>));
    }
    if (rotateReportKey === true) return json(await service.rotateReportKey(auth.user.uid, code));
    if (workspaceKey !== undefined) return json(await service.setWorkspaceKey(auth.user.uid, code, workspaceKey));
    return json({ error: "invalid", message: "Nothing to change." }, 400);
  } catch (error) {
    return failure("PATCH /api/org/programmes/[code]", error);
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const code = normaliseCode((await params).code);
    if (!code) return notFound();
    const auth = await requireUser(request, "orgManage");
    if ("response" in auth) return auth.response;
    await service.deleteProgramme(auth.user.uid, code);
    return json({ ok: true });
  } catch (error) {
    return failure("DELETE /api/org/programmes/[code]", error);
  }
}
