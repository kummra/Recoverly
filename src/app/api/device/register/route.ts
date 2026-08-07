import { createHash, randomBytes, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { deviceRegisterSchema } from "@/lib/schemas";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";

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
 * Register a device to the signed-in user and mint a one-time device token.
 *
 * The token is returned exactly once (to flash into the firmware); we persist
 * only its SHA-256 hash, so a leaked Firestore read can't recover it. The device
 * then uses {deviceId, token} to call /api/device-ingest — no account password.
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

    const limited = rateLimit(`devreg:${uid}`, LIMITS.deviceRegister.limit, LIMITS.deviceRegister.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const parsed = deviceRegisterSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const deviceId = randomUUID();
    const token = randomBytes(32).toString("hex"); // 256-bit device secret
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await adminDb.collection("devices").doc(deviceId).set({
      ownerUid: uid,
      tokenHash,
      label: parsed.data.label,
      kind: parsed.data.kind,
      createdAt: FieldValue.serverTimestamp(),
      lastSeenAt: null
    });

    // Returned ONCE — never retrievable again.
    return NextResponse.json({ deviceId, token });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[POST /api/device/register]", err);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
