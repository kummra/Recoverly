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
  setDoc
} from "firebase/firestore";

import { firestore } from "@/lib/firebase";
import { type DrinkRecordInput, type GoalInput } from "@/lib/schemas";

export type DrinkRecord = {
  id: string;
  quantity: number;
  type: string;
  mood?: string;
  createdAt: Date;
};

export type UserProfile = {
  goalWeeklyMl: number;
  reminderTime?: string;
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
      // Explicitly write null when reminderTime is absent so merge:true
      // actually clears the field instead of silently preserving the old value.
      reminderTime: input.reminderTime ?? null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getClientDb();
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    goalWeeklyMl: Number(data.goalWeeklyMl ?? 0),
    reminderTime: data.reminderTime,
    updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined
  };
}

export async function addDrinkRecord(userId: string, record: DrinkRecordInput) {
  const db = getClientDb();
  const ref = collection(db, "users", userId, "drinkRecords");
  await addDoc(ref, {
    quantity: record.quantity,
    type: record.type,
    mood: record.mood ?? null,
    createdAt: serverTimestamp()
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
