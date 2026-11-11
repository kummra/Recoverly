import { NextRequest, NextResponse } from "next/server";

import { feedbackToDocument, parseFeedback } from "@/lib/feedback";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getUserIdFromRequest } from "@/lib/server-auth";

export const runtime = "nodejs";

/** A genuine answer is a few hundred bytes. */
const MAX_BODY_BYTES = 4_000;

/**
 * Keep what a signed-in person says would help them, under their own account
 * (`users/{uid}/feedback`). Written with the Admin SDK, so Firestore's rules
 * give browsers no access to it and none had to change. Because it sits inside
 * the user's document, deleting the account deletes it (`recursiveDelete` in
 * /api/account): "delete my data" holds without that route knowing about it.
 *
 * It holds the choices, an optional message and a time. Nothing else.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) {
      return NextResponse.json({ error: "This is not available right now." }, { status: 503 });
    }

    const uid = await getUserIdFromRequest(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limited = rateLimit(`feedback:${uid}`, LIMITS.feedback.limit, LIMITS.feedback.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

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

    const parsed = parseFeedback(body);
    if (!parsed.ok) return NextResponse.json({ error: "Please choose something or write something." }, { status: 400 });

    await adminDb.collection("users").doc(uid).collection("feedback").add(feedbackToDocument(parsed.data, new Date()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    // The message only: it never contains what the person wrote.
    // eslint-disable-next-line no-console
    console.error("[POST /api/feedback]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not send that. Please try again." }, { status: 500 });
  }
}
