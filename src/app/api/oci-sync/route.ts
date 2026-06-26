import { NextRequest, NextResponse } from "next/server";

import { adminAuth, isAdminConfigured } from "@/lib/firebase-admin";
import { isOracleConfigured } from "@/lib/oracle-db";
import {
  syncUserProfile,
  syncDrinkRecord,
  syncChatSession,
  syncChatMessage,
  syncDeviceLink,
  deleteSyncedDeviceLink,
  deleteSyncedDrinkRecords,
  deleteSyncedChatSessions,
} from "@/lib/oracle-storage";

export const runtime = "nodejs";

type SyncPayload =
  | { type: "user_profile"; data: Record<string, unknown> }
  | { type: "drink_record"; recordId: string; data: Record<string, unknown> }
  | { type: "chat_session"; chatId: string; data: Record<string, unknown> }
  | { type: "chat_message"; messageId: string; chatId: string; data: Record<string, unknown> }
  | { type: "device_link"; deviceId: string; linkedAt: number }
  | { type: "device_unlink"; deviceId: string }
  | { type: "delete_drink_records" }
  | { type: "delete_chat_sessions" };

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

    const payload = (await request.json()) as SyncPayload;

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
