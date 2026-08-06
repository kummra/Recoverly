import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminAuth, isAdminConfigured } from "@/lib/firebase-admin";
import { isOracleConfigured } from "@/lib/oracle-db";
import {
  syncUserProfile,
  syncDrinkRecord,
  syncChatSession,
  syncChatMessage,
  syncCravingEvent,
  syncDeviceLink,
  deleteSyncedDeviceLink,
  deleteSyncedDrinkRecords,
  deleteSyncedChatSessions,
} from "@/lib/oracle-storage";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Runtime-validated, not just a cast: these values are persisted to Oracle, so
// unbounded strings/objects would bloat storage or blow the column widths.
// Bind parameters already prevent SQL injection; this bounds the payload.
const ID = z.string().trim().min(1).max(128);
const DATA = z.record(z.string(), z.unknown()).refine(
  (o) => JSON.stringify(o).length <= 20_000,
  { message: "payload too large" }
);

const syncPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user_profile"), data: DATA }),
  z.object({ type: z.literal("drink_record"), recordId: ID, data: DATA }),
  z.object({ type: z.literal("chat_session"), chatId: ID, data: DATA }),
  z.object({ type: z.literal("chat_message"), messageId: ID, chatId: ID, data: DATA }),
  z.object({ type: z.literal("device_link"), deviceId: ID, linkedAt: z.number().int().nonnegative() }),
  z.object({ type: z.literal("device_unlink"), deviceId: ID }),
  z.object({ type: z.literal("craving_event"), eventId: ID, data: DATA }),
  z.object({ type: z.literal("delete_drink_records") }),
  z.object({ type: z.literal("delete_chat_sessions") })
]);

async function getUserId(request: NextRequest): Promise<string | null> {
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

export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    // Oracle is an optional mirror — if it isn't configured, succeed quietly so
    // the primary (Firestore) write path is never blocked.
    if (!isOracleConfigured) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const uid = await getUserId(request);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimit(`ocisync:${uid}`, LIMITS.ociSync.limit, LIMITS.ociSync.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

    const parsed = syncPayloadSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });
    }
    const payload = parsed.data;

    switch (payload.type) {
      case "user_profile":
        await syncUserProfile(uid, payload.data);
        break;
      case "drink_record":
        await syncDrinkRecord(payload.recordId, uid, payload.data);
        break;
      case "chat_session":
        await syncChatSession(payload.chatId, uid, payload.data);
        break;
      case "chat_message":
        await syncChatMessage(payload.messageId, uid, payload.chatId, payload.data);
        break;
      case "device_link":
        await syncDeviceLink(payload.deviceId, uid, payload.linkedAt);
        break;
      case "craving_event": {
        const d = payload.data as { intensity?: unknown; outcome?: unknown };
        await syncCravingEvent(
          payload.eventId,
          uid,
          typeof d.intensity === "number" ? d.intensity : 0,
          typeof d.outcome === "string" ? d.outcome : "unresolved",
          payload.data
        );
        break;
      }
      case "device_unlink":
        await deleteSyncedDeviceLink(payload.deviceId, uid);
        break;
      case "delete_drink_records":
        await deleteSyncedDrinkRecords(uid);
        break;
      case "delete_chat_sessions":
        await deleteSyncedChatSessions(uid);
        break;
      default:
        return NextResponse.json({ error: "Unknown sync type" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[POST /api/oci-sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
