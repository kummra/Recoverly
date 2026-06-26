import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { sobrietySignalSchema } from "@/lib/schemas";
import { syncSobrietySignal } from "@/lib/oracle-storage";

export const runtime = "nodejs";

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  if (!adminAuth) return null;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * Manual sobriety entry — a reading the user (or an NGO/clinic on their behalf)
 * types in from ANY existing breathalyser (Jupiter, clinic device, etc.).
 * User-authenticated; written to Firestore (live) and mirrored to Oracle.
 *
 * Only `manual`/`bluetooth` sources are accepted here — the SEN0376 guardian's
 * presence signals come through /api/device-ingest, never the manual path.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb || !adminAuth) {
      return NextResponse.json({ error: "Server not configured." }, { status: 500 });
    }

    const uid = await getUserIdFromRequest(request);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = sobrietySignalSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    const { source, result, bac, brac, note, deviceName } = parsed.data;
    if (source !== "manual" && source !== "bluetooth") {
      return NextResponse.json({ error: "This endpoint only accepts manual/bluetooth readings." }, { status: 400 });
    }

    const now = FieldValue.serverTimestamp();
    const ref = adminDb.collection("users").doc(uid).collection("sobrietySignals").doc();

    const payload: Record<string, unknown> = { source, result, createdAt: now };
    if (bac != null) payload.bac = bac;
    if (brac != null) payload.brac = brac;
    if (note) payload.note = note;
    if (deviceName) payload.deviceName = deviceName;

    await ref.set(payload);

    await syncSobrietySignal(ref.id, uid, source, result, {
      source,
      result,
      bac: bac ?? null,
      brac: brac ?? null,
      note: note ?? null,
      deviceName: deviceName ?? null,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true, signalId: ref.id });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[POST /api/sobriety]", err);
    return NextResponse.json({ error: "Could not save reading." }, { status: 500 });
  }
}
