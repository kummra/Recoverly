import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch
} from "firebase/firestore";

import { auth, firestore } from "@/lib/firebase";
import { type AuditResultInput, type CravingEventInput, type DrinkRecordInput, type GoalInput } from "@/lib/schemas";

/**
 * Mirror a write to Oracle Cloud (best-effort, fire-and-forget).
 *
 * Firestore is the primary, real-time store; this keeps an equal copy of the
 * data in Oracle via the server-side /api/oci-sync route (which holds the
 * Oracle credentials). Failures never block or surface to the user — the
 * primary write has already succeeded by the time this runs.
 */
async function syncToOracle(payload: Record<string, unknown>): Promise<void> {
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return;
    void fetch("/api/oci-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch { /* fire-and-forget */ }
}

export type DrinkRecord = {
  id: string;
  quantity: number;
  type: string;
  /** Free-text name when type is "other". */
  otherType?: string;
  mood?: string;
  createdAt: Date;
};

export type AuditRecord = {
  id: string;
  score: number;
  zone: string;
  createdAt: Date;
};

export type CravingEvent = {
  id: string;
  intensity: number;
  outcome: string;
  trigger?: string;
  secondsElapsed?: number;
  createdAt: Date;
};

export type UserProfile = {
  goalWeeklyMl: number;
  /** Absent on profiles written before goal intent existed — treat as "reduce". */
  goalType?: "reduce" | "quit";
  reminderTime?: string;
  motivation?: string;
  displayName?: string;
  updatedAt?: Date;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}

function getClientDb() {
  if (!firestore) {
    throw new Error("Firebase client is not configured. Add NEXT_PUBLIC_FIREBASE_* environment variables.");
  }
  return firestore;
}

export async function saveUserPreferences(userId: string, input: GoalInput) {
  const db = getClientDb();
  const ref = doc(db, "users", userId);
  await setDoc(
    ref,
    {
      goalWeeklyMl: input.goalWeeklyMl,
      goalType: input.goalType ?? null,
      // Explicitly write null when a field is absent so merge:true actually
      // clears it instead of silently preserving the old value.
      reminderTime: input.reminderTime ?? null,
      motivation: input.motivation ?? null,
      displayName: input.displayName ?? null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  void syncToOracle({
    type: "user_profile",
    data: {
      goalWeeklyMl: input.goalWeeklyMl,
      goalType: input.goalType ?? null,
      reminderTime: input.reminderTime ?? null,
      motivation: input.motivation ?? null,
      displayName: input.displayName ?? null,
    },
  });
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getClientDb();
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    goalWeeklyMl: Number(data.goalWeeklyMl ?? 0),
    goalType: data.goalType === "quit" ? "quit" : data.goalType === "reduce" ? "reduce" : undefined,
    reminderTime: data.reminderTime,
    motivation: typeof data.motivation === "string" ? data.motivation : undefined,
    displayName: typeof data.displayName === "string" ? data.displayName : undefined,
    updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined
  };
}

export async function addDrinkRecord(userId: string, record: DrinkRecordInput) {
  const db = getClientDb();
  const ref = collection(db, "users", userId, "drinkRecords");
  const created = await addDoc(ref, {
    quantity: record.quantity,
    type: record.type,
    otherType: record.otherType ?? null,
    mood: record.mood ?? null,
    createdAt: serverTimestamp()
  });

  void syncToOracle({
    type: "drink_record",
    recordId: created.id,
    data: {
      quantity: record.quantity,
      type: record.type,
      otherType: record.otherType ?? null,
      mood: record.mood ?? null,
      createdAt: new Date().toISOString(),
    },
  });
}

export async function getDrinkRecords(userId: string): Promise<DrinkRecord[]> {
  const db = getClientDb();
  const ref = collection(db, "users", userId, "drinkRecords");
  const q = query(ref, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      quantity: Number(data.quantity ?? 0),
      type: String(data.type ?? "other"),
      otherType: typeof data.otherType === "string" ? data.otherType : undefined,
      mood: typeof data.mood === "string" ? data.mood : undefined,
      createdAt: toDate(data.createdAt)
    };
  });
}

export function subscribeDrinkRecords(userId: string, callback: (records: DrinkRecord[]) => void) {
  const db = getClientDb();
  const ref = collection(db, "users", userId, "drinkRecords");
  const q = query(ref, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const records = snap.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        quantity: Number(data.quantity ?? 0),
        type: String(data.type ?? "other"),
        mood: typeof data.mood === "string" ? data.mood : undefined,
        createdAt: toDate(data.createdAt)
      } satisfies DrinkRecord;
    });
    callback(records);
  });
}

// ─── AUDIT results ──────────────────────────────────────────────────────────

export async function addAuditResult(userId: string, result: AuditResultInput) {
  const db = getClientDb();
  const created = await addDoc(collection(db, "users", userId, "auditResults"), {
    score: result.score,
    zone: result.zone,
    answers: result.answers,
    createdAt: serverTimestamp()
  });

  void syncToOracle({
    type: "audit_result",
    resultId: created.id,
    data: { score: result.score, zone: result.zone, createdAt: new Date().toISOString() }
  });
}

export async function getAuditResults(userId: string): Promise<AuditRecord[]> {
  const db = getClientDb();
  const q = query(collection(db, "users", userId, "auditResults"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      score: Number(data.score ?? 0),
      zone: String(data.zone ?? "low"),
      createdAt: toDate(data.createdAt)
    };
  });
}

// ─── Craving events ─────────────────────────────────────────────────────────

export async function addCravingEvent(userId: string, event: CravingEventInput) {
  const db = getClientDb();
  const created = await addDoc(collection(db, "users", userId, "cravingEvents"), {
    intensity: event.intensity,
    outcome: event.outcome,
    trigger: event.trigger ?? null,
    secondsElapsed: event.secondsElapsed ?? null,
    createdAt: serverTimestamp()
  });

  void syncToOracle({
    type: "craving_event",
    eventId: created.id,
    data: {
      intensity: event.intensity,
      outcome: event.outcome,
      trigger: event.trigger ?? null,
      secondsElapsed: event.secondsElapsed ?? null,
      createdAt: new Date().toISOString()
    }
  });
}

export async function getCravingEvents(userId: string): Promise<CravingEvent[]> {
  const db = getClientDb();
  const q = query(collection(db, "users", userId, "cravingEvents"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      intensity: Number(data.intensity ?? 0),
      outcome: String(data.outcome ?? "unresolved"),
      trigger: typeof data.trigger === "string" ? data.trigger : undefined,
      secondsElapsed: typeof data.secondsElapsed === "number" ? data.secondsElapsed : undefined,
      createdAt: toDate(data.createdAt)
    };
  });
}

/** Firestore caps a batch at 500 writes; stay under it. */
const BATCH_LIMIT = 400;

async function deleteDocsInBatches(
  db: ReturnType<typeof getClientDb>,
  docs: Array<{ ref: Parameters<ReturnType<typeof writeBatch>["delete"]>[0] }>
) {
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const d of docs.slice(i, i + BATCH_LIMIT)) batch.delete(d.ref);
    await batch.commit();
  }
}

/** Delete every AI chat session (and its messages). Returns sessions removed. */
export async function deleteAllChatSessions(userId: string): Promise<number> {
  const db = getClientDb();
  const sessionsSnap = await getDocs(collection(db, "users", userId, "aiChats"));
  if (sessionsSnap.empty) return 0;

  // Messages are a subcollection — deleting the parent doc would orphan them.
  for (const session of sessionsSnap.docs) {
    const messagesSnap = await getDocs(
      collection(db, "users", userId, "aiChats", session.id, "messages")
    );
    if (!messagesSnap.empty) await deleteDocsInBatches(db, messagesSnap.docs);
  }

  await deleteDocsInBatches(db, sessionsSnap.docs);
  void syncToOracle({ type: "delete_chat_sessions" });
  return sessionsSnap.size;
}

export async function createChatSession(userId: string, title: string) {
  const db = getClientDb();
  const sessionRef = collection(db, "users", userId, "aiChats");
  const result = await addDoc(sessionRef, {
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return result.id;
}

export async function listChatSessions(userId: string): Promise<ChatSession[]> {
  const db = getClientDb();
  const ref = collection(db, "users", userId, "aiChats");
  const q = query(ref, orderBy("updatedAt", "desc"), limit(30));
  const snap = await getDocs(q);
  return snap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      title: String(data.title ?? "Untitled chat"),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt)
    };
  });
}

export async function listChatMessages(userId: string, chatId: string): Promise<ChatMessage[]> {
  const db = getClientDb();
  const ref = collection(db, "users", userId, "aiChats", chatId, "messages");
  const q = query(ref, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      role: data.role === "assistant" ? "assistant" : "user",
      content: String(data.content ?? ""),
      createdAt: toDate(data.createdAt)
    };
  });
}
