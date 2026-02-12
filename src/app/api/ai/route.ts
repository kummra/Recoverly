import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { aiRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
You are a compassionate recovery-support assistant for alcohol reduction.
Rules:
- Never shame the user.
- Reinforce identity-based progress and practical next steps.
- If user mentions self-harm or immediate danger, strongly advise contacting emergency services and trusted local support now.
- Keep tone calm, concise, and encouraging.
`;

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  if (!adminAuth) return null;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    // Expired, revoked, or malformed token — treat as unauthenticated.
    // The caller returns 401 when this function returns null.
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured || !adminDb) {
      return NextResponse.json({ error: "Firebase Admin is not configured. Check server environment variables." }, { status: 500 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey });

    const uid = await getUserIdFromRequest(request);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = aiRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { messages } = parsed.data;
    const chatId = parsed.data.chatId ?? randomUUID();
    const safeMessages = messages.map((item) => ({
      role: item.role,
      content: item.content
    }));

    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...safeMessages]
    });

    const reply = result.choices[0]?.message?.content?.trim() ?? "I am here with you. Tell me what you need right now.";
    const now = FieldValue.serverTimestamp();

    const sessionRef = adminDb.collection("users").doc(uid).collection("aiChats").doc(chatId);
    const sessionSnap = await sessionRef.get();

    if (sessionSnap.exists) {
      await sessionRef.update({ updatedAt: now });
    } else {
      await sessionRef.set({
        title: safeMessages[0]?.content?.slice(0, 60) || "Recovery guidance chat",
        createdAt: now,
        updatedAt: now
      });
    }

    await sessionRef.collection("messages").add({
      role: "user",
      content: safeMessages[safeMessages.length - 1]?.content ?? "",
      createdAt: now
    });
    await sessionRef.collection("messages").add({
      role: "assistant",
      content: reply,
      createdAt: now
    });

    return NextResponse.json({ chatId, reply });
  } catch (error) {
    // Log the real error server-side for debugging; return a generic
    // message to the client to avoid leaking internal details (OpenAI
    // org IDs, Firestore paths, rate-limit specifics, etc.).
    // eslint-disable-next-line no-console
    console.error("[POST /api/ai]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
