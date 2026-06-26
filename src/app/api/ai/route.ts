import { randomUUID } from "crypto";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { aiRequestSchema } from "@/lib/schemas";
import { CRISIS_HELP_MESSAGE, detectCrisis } from "@/lib/safety";

export const runtime = "nodejs";

// Qwen on Groq Cloud (OpenAI-compatible API). The model id is overridable via
// env so it can be corrected without a code change — confirm the exact id from
// the Groq console's Models page, as Groq rejects unknown ids.
const GROQ_MODEL = process.env.GROQ_MODEL ?? "qwen/qwen3.6-27b";

const SYSTEM_PROMPT = `
You are a compassionate, non-judgmental recovery-support companion for people reducing or quitting alcohol. You are NOT a doctor, nurse, or therapist, and you must never present yourself as one.

Core rules (do not break these):
- NO MEDICAL ADVICE: never give medical advice, diagnoses, medication or dosage guidance, or treatment plans, and never claim to treat, cure, or be a substitute for professional care. For any medical or clinical question, encourage the user to consult a qualified doctor or counsellor.
- WITHDRAWAL SAFETY: stopping alcohol suddenly can be medically dangerous for heavy or dependent drinkers (it can cause seizures and delirium tremens, which can be life-threatening). If the user talks about quitting — especially abruptly, or if they describe heavy or daily drinking — gently warn them about this and urge them to see a doctor before stopping and to only reduce under medical supervision. Never encourage anyone to quit cold-turkey.
- CRISIS: if the user mentions self-harm, suicide, hopelessness, or being in danger, respond with warmth, take it seriously, never minimise it, and point them to real help right away (a crisis helpline, a trusted person, or emergency services). You are not their only support.
- NO SHAME: never shame or scold. Reinforce identity-based progress ("you are someone who is choosing awareness") and offer small, practical, non-medical next steps.
- Keep replies calm, concise, and encouraging.

You offer emotional support and motivation only — not medical, legal, or clinical advice.
`;

// Qwen3 is a reasoning model that can wrap private reasoning in <think>…</think>.
// Strip it so the user only ever sees the final answer.
function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .trim();
}

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
  // Tracked outside the try so that, even if generation fails, a user who
  // expressed crisis still receives a helpline instead of a generic error.
  let crisisDetected = false;
  let responseChatId: string | undefined;

  try {
    if (!isAdminConfigured || !adminDb) {
      return NextResponse.json({ error: "Firebase Admin is not configured. Check server environment variables." }, { status: 500 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
    }

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
    responseChatId = chatId;
    const safeMessages = messages.map((item) => ({
      role: item.role,
      content: item.content
    }));

    // Deterministic safety net: check the latest user message for crisis language.
    const lastUserMessage = [...safeMessages].reverse().find((item) => item.role === "user")?.content ?? "";
    crisisDetected = detectCrisis(lastUserMessage);

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.4,
      // Headroom so a reasoning model's <think> phase doesn't crowd out the
      // visible answer (the thinking is stripped below before the user sees it).
      max_tokens: 2048,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...safeMessages]
    });

    const rawReply = completion.choices?.[0]?.message?.content ?? "";
    const modelReply = stripThinking(rawReply) || "I am here with you. Tell me what you need right now.";

    // If the user expressed crisis, ALWAYS lead with real help — regardless of
    // what the model returned. Defense in depth on top of the system prompt.
    const reply = crisisDetected ? `${CRISIS_HELP_MESSAGE}\n\n${modelReply}` : modelReply;

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
    // message to the client to avoid leaking internal details.
    // eslint-disable-next-line no-console
    console.error("[POST /api/ai]", error);

    // Safety override: never leave someone who expressed crisis without help,
    // even if the model call or storage failed.
    if (crisisDetected) {
      return NextResponse.json({ chatId: responseChatId ?? "", reply: CRISIS_HELP_MESSAGE }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
