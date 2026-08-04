import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { sobrietySignalSchema } from "@/lib/schemas";
import { syncSobrietySignal } from "@/lib/oracle-storage";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");

/** Constant-time compare of two hex digests of equal length. */
function hashesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * IoT ingest for the Sobriety Guardian device (and any future device).
 *
 * The device authenticates with a per-device token (provisioned via
 * /api/device/register) — NEVER a user account password. We resolve the owning
 * user from the `devices/{deviceId}` registry, then write the signal to
 * Firestore (live app view) and mirror it to Oracle (durable archive).
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) {
      return NextResponse.json({ error: "Server not configured." }, { status: 500 });
    }

    const deviceId = request.headers.get("x-device-id")?.trim();
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!deviceId || !token) {
      return NextResponse.json({ error: "Missing device credentials." }, { status: 401 });
    }

    // Keyed on deviceId and applied before the lookup, so a leaked or guessed
    // token can't be used to hammer Firestore/Oracle with writes.
    const limited = rateLimit(`ingest:${deviceId}`, LIMITS.deviceIngest.limit, LIMITS.deviceIngest.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const deviceSnap = await adminDb.collection("devices").doc(deviceId).get();
    if (!deviceSnap.exists) {
      return NextResponse.json({ error: "Unknown device." }, { status: 401 });
    }
    const device = deviceSnap.data() as { ownerUid?: string; tokenHash?: string } | undefined;
    if (!device?.ownerUid || !device.tokenHash || !hashesMatch(sha256Hex(token), device.tokenHash)) {
      return NextResponse.json({ error: "Invalid device token." }, { status: 401 });
    }
    const uid = device.ownerUid;

    const parsed = sobrietySignalSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signal payload." }, { status: 400 });
    }
    const { source, result, ppm, bac, brac, note, deviceName } = parsed.data;

    const now = FieldValue.serverTimestamp();
    const signalRef = adminDb.collection("users").doc(uid).collection("sobrietySignals").doc();

    // Drop undefined fields so Firestore doesn't reject them.
    const payload: Record<string, unknown> = { source, result, deviceId, createdAt: now };
    if (ppm != null) payload.ppm = ppm;
    if (bac != null) payload.bac = bac;
    if (brac != null) payload.brac = brac;
    if (note) payload.note = note;
    if (deviceName) payload.deviceName = deviceName;

    await signalRef.set(payload);

    // Latest-state doc powers the live "device status" tile without scanning history.
    await adminDb.collection("users").doc(uid).collection("deviceStatus").doc(deviceId).set(
      { lastResult: result, lastSource: source, lastPpm: ppm ?? null, lastSeenAt: now },
      { merge: true }
    );
    await deviceSnap.ref.set({ lastSeenAt: now }, { merge: true });

    // Durable mirror (best-effort; never blocks the device).
    await syncSobrietySignal(signalRef.id, uid, source, result, {
      source,
      result,
      ppm: ppm ?? null,
      bac: bac ?? null,
      brac: brac ?? null,
      note: note ?? null,
      deviceName: deviceName ?? null,
      deviceId,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true, signalId: signalRef.id });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[POST /api/device-ingest]", err);
    return NextResponse.json({ error: "Ingest failed." }, { status: 500 });
  }
}
