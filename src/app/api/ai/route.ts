import { randomUUID } from "crypto";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { trimToTokenBudget } from "@/lib/ai-context";
import { AI_FAILURE_STATUS, classifyAiFailure, describeAiError } from "@/lib/ai-errors";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { aiRequestSchema } from "@/lib/schemas";
import { CRISIS_HELP_MESSAGE, detectCrisis } from "@/lib/safety";
import { syncChatSession, syncChatMessage } from "@/lib/oracle-storage";
import { LIMITS, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Qwen on Groq Cloud (OpenAI-compatible API). Groq renames and withdraws models
// without notice: qwen/qwen3.6-27b was removed and every request failed with
// model_not_found. Groq lists this one as a "preview" model, so if the coach
// starts failing, check the live list with
// GET https://api.groq.com/openai/v1/models and set GROQ_MODEL (no code change
// needed — Groq rejects unknown ids).
const GROQ_MODEL = process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b";

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

// Some reasoning models wrap private reasoning in <think>…</think>.
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

    // Each call costs money; an unbounded loop could exhaust the quota and take
    // the coach offline for everyone, including someone in crisis.
    const limited = rateLimit(`ai:${uid}`, LIMITS.ai.limit, LIMITS.ai.windowMs);
    if (!limited.allowed) return tooManyRequests(limited.retryAfter);

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
    // What is sent to the model is only the recent part of the chat, sized to
    // fit the provider's per-minute limit. The saved history below is unchanged.
    const contextMessages = trimToTokenBudget(safeMessages);

    // Deterministic safety net: check the latest user message for crisis language.
    const lastUserMessage = [...safeMessages].reverse().find((item) => item.role === "user")?.content ?? "";
    crisisDetected = detectCrisis(lastUserMessage);

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.4,
      // Headroom so a reasoning model's <think> phase doesn't crowd out the
      // visible answer (the thinking is stripped below before the user sees it).
      // Replies measured at 250 to 500 tokens, so this is about double.
      max_tokens: 1200,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...contextMessages]
    });

    const rawReply = completion.choices?.[0]?.message?.content ?? "";
    const modelReply = stripThinking(rawReply) || "I am here with you. Tell me what you need right now.";

    // If the user expressed crisis, ALWAYS lead with real help — regardless of
    // what the model returned. Defense in depth on top of the system prompt.
    const reply = crisisDetected ? `${CRISIS_HELP_MESSAGE}\n\n${modelReply}` : modelReply;

    const now = FieldValue.serverTimestamp();

    const sessionRef = adminDb.collection("users").doc(uid).collection("aiChats").doc(chatId);
    const sessionSnap = await sessionRef.get();

    const sessionTitle = safeMessages[0]?.content?.slice(0, 60) || "Recovery guidance chat";
    if (sessionSnap.exists) {
      await sessionRef.update({ updatedAt: now });
    } else {
      await sessionRef.set({
        title: sessionTitle,
        createdAt: now,
        updatedAt: now
      });
    }

    const userContent = safeMessages[safeMessages.length - 1]?.content ?? "";
    const userMsgRef = await sessionRef.collection("messages").add({
      role: "user",
      content: userContent,
      createdAt: now
    });
    const assistantMsgRef = await sessionRef.collection("messages").add({
      role: "assistant",
      content: reply,
      createdAt: now
    });

    // Mirror the conversation to Oracle. Firestore above is the source of
    // truth, so this is strictly best-effort: oracle-storage bounds each write
    // and swallows its own errors, and we await only so the writes land before
    // the serverless instance is frozen. It must never be able to delay — let
    // alone fail — the reply the user is waiting on.
    const nowIso = new Date().toISOString();
    try {
      await Promise.all([
        syncChatSession(chatId, uid, { title: sessionTitle, updatedAt: nowIso }),
        syncChatMessage(userMsgRef.id, uid, chatId, { role: "user", content: userContent, createdAt: nowIso }),
        syncChatMessage(assistantMsgRef.id, uid, chatId, { role: "assistant", content: reply, createdAt: nowIso }),
      ]);
    } catch {
      // Already logged inside oracle-storage; the reply still goes out.
    }

    return NextResponse.json({ chatId, reply });
  } catch (error) {
    // Log the real error server-side for debugging (one line: the provider's
    // full error object includes its response headers and cookies); return a
    // generic message to the client to avoid leaking internal details.
    // eslint-disable-next-line no-console
    console.error("[POST /api/ai]", describeAiError(error));

    // Safety override: never leave someone who expressed crisis without help,
    // even if the model call or storage failed.
    if (crisisDetected) {
      return NextResponse.json({ chatId: responseChatId ?? "", reply: CRISIS_HELP_MESSAGE }, { status: 200 });
    }

    // Tell the page whether to say "busy, wait a minute" or "not available",
    // so it can point at help that does not depend on the coach.
    const kind = classifyAiFailure(error);
    return NextResponse.json(
      {
        error:
          kind === "busy"
            ? "The coach is busy right now. Please try again in a minute."
            : "The coach is not available right now. Please try again later.",
        code: kind
      },
      {
        status: AI_FAILURE_STATUS[kind],
        headers: kind === "busy" ? { "Retry-After": "30" } : undefined
      }
    );
  }
}
