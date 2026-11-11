import { NextRequest, NextResponse } from "next/server";

import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { enquiryToDocument, isHoneypotTripped, parseEnquiry } from "@/lib/partners";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** A genuine enquiry is a few hundred bytes. */
const MAX_BODY_BYTES = 10_000;

/** The only handle on an anonymous caller. Used in memory for the rate limit
 *  and never stored or logged. */
function callerKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Browsers attach the page's origin to a cross-site request, so a page on
 * another site cannot post here on someone's behalf. Clients that send no
 * origin (curl, scripts) are held back by the rate limit instead.
 */
function fromOurOwnPages(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host")];
  return hosts.includes(originHost);
}

/**
 * Receive an enquiry from an organisation on the "For organisations" page and
 * keep it for the team to answer. Public by design (the people sending it have
 * no account), so everything that makes that safe is here: origin check, rate
 * limits, a size cap, a honeypot, strict validation, and storing only what was
 * typed. The collection is written by the Admin SDK only; Firestore rules give
 * browsers no access to it at all.
 */
export async function POST(request: NextRequest) {
  try {
    if (!fromOurOwnPages(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const caller = rateLimit(`partners:${callerKey(request)}`, LIMITS.partners.limit, LIMITS.partners.windowMs);
    if (!caller.allowed) return tooManyRequests(caller.retryAfter);
    const overall = rateLimit("partners:all", LIMITS.partnersAll.limit, LIMITS.partnersAll.windowMs);
    if (!overall.allowed) return tooManyRequests(overall.retryAfter);

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Unsupported content type." }, { status: 415 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "That is too large to send." }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    // A bot that filled the hidden field is told it worked and nothing is kept.
    if (isHoneypotTripped(body)) return NextResponse.json({ ok: true });

    const parsed = parseEnquiry(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Please check the highlighted fields.", fields: parsed.fields }, { status: 400 });
    }

    if (!isAdminConfigured || !adminDb) {
      return NextResponse.json({ error: "Enquiries are not available right now. Please try again later." }, { status: 503 });
    }

    await adminDb.collection("partnerEnquiries").add(enquiryToDocument(parsed.data, new Date()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    // The message only: it never contains what the visitor typed.
    // eslint-disable-next-line no-console
    console.error("[POST /api/partners]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not send your enquiry. Please try again." }, { status: 500 });
  }
}
