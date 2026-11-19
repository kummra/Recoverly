import { NextRequest } from "next/server";

import { failure, imageResponse, json, readJson, requireUser, unavailable } from "@/lib/org/route";
import { orgService } from "@/lib/org/server";
import { normaliseCode } from "@/lib/programme";

export const runtime = "nodejs";

type Context = { params: Promise<{ code: string }> };

const notFound = () => json({ error: "not_found", message: "That was not found." }, 404);

/** The organisation's own look at its logo: `?which=live`, `draft`, or (the default) the newest. For the portal's preview; the answer is a picture. */
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const code = normaliseCode((await params).code);
    if (!code) return notFound();
    const auth = await requireUser(request, "orgManage");
    if ("response" in auth) return auth.response;
    const asked = request.nextUrl.searchParams.get("which");
    const logo = await service.readLogo(auth.user.uid, code, asked === "live" || asked === "draft" ? asked : "latest");
    return logo ? imageResponse(logo, "no-store") : notFound();
  } catch (error) {
    return failure("GET /api/org/programmes/[code]/logo", error);
  }
}

/** Send a logo: `{ "type": "png" | "jpeg", "data": "<base64>" }`. Checked, kept as a draft, shown to people only once the owner approves it. */
export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const service = orgService;
    if (!service) return unavailable();
    const code = normaliseCode((await params).code);
    if (!code) return notFound();
    const auth = await requireUser(request, "orgManage");
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, 100_000);
    if ("response" in parsed) return parsed.response;
    return json({ programme: await service.setLogo(auth.user.uid, code, { type: parsed.body.type, data: parsed.body.data }) });
  } catch (error) {
    return failure("PUT /api/org/programmes/[code]/logo", error);
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
    return json({ programme: await service.removeLogo(auth.user.uid, code) });
  } catch (error) {
    return failure("DELETE /api/org/programmes/[code]/logo", error);
  }
}
