"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bot, MessageSquarePlus, Send, User } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { CrisisHelpline } from "@/components/safety-notice";
import { useT } from "@/components/i18n-provider";
import { VoiceInput } from "@/components/voice-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { type ChatMessage, type ChatSession, createChatSession, listChatMessages, listChatSessions } from "@/lib/firestore";
import { AI_CONTEXT_WINDOW } from "@/lib/schemas";

export default function AIPage() {
  return (
    <ProtectedRoute>
      <AIContent />
    </ProtectedRoute>
  );
}

function TypingIndicator() {
  return (
    <div className="flex max-w-[90%] items-start gap-2.5 rounded-2xl bg-surface px-4 py-3">
      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div className="flex items-center gap-1 py-1">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}

function AIContent() {
  const t = useT();
  const { user, getIdToken } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const skipNextMessageLoad = useRef(false);

  const activeSessionTitle = useMemo(() => sessions.find((item) => item.id === chatId)?.title ?? t("ai.newConversation"), [chatId, sessions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const refreshSessions = async () => {
    if (!user) return;
    const next = await listChatSessions(user.uid);
    setSessions(next);
    if (!chatId && next.length > 0) {
      setChatId(next[0].id);
    }
  };

  useEffect(() => {
    if (!user) return;
    refreshSessions().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!chatId || !user) {
      setMessages([]);
      return;
    }

    // After a successful send, we already have the correct messages in state.
    // Skip the Firestore refetch to avoid overwriting optimistic messages.
    if (skipNextMessageLoad.current) {
      skipNextMessageLoad.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);

    listChatMessages(user.uid, chatId)
      .then((data) => {
        if (!cancelled) {
          setMessages(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, user?.uid]);

  const createNewChat = async () => {
    if (!user) return;
    const id = await createChatSession(user.uid, t("ai.newChatTitle"));
    await refreshSessions();
    setChatId(id);
  };

  const send = async () => {
    if (!user || !input.trim() || sending) return;
    setSending(true);
    setError("");

    // Track the working chat ID locally. For new chats, defer setChatId until
    // after the API responds so the message-loading effect doesn't fire
    // prematurely against an empty Firestore session.
    let workingChatId = chatId;
    if (!workingChatId) {
      workingChatId = await createChatSession(user.uid, input.trim().slice(0, 60));
    }

    const optimisticUserMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: new Date()
    };

    const nextMessages = [...messages, optimisticUserMessage];
    setMessages(nextMessages);
    setInput("");

    try {
      const token = await getIdToken();
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          chatId: workingChatId,
          // Only send the most recent messages as context for the AI.
          // The full history stays in state for UI display, but the API
          // payload is bounded by AI_CONTEXT_WINDOW to avoid schema
          // rejection and control token usage on the AI provider.
          messages: nextMessages
            .slice(-AI_CONTEXT_WINDOW)
            .map((item) => ({ role: item.role, content: item.content }))
        })
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const payload = (await response.json()) as { reply: string; chatId: string };

      // Append the assistant's reply directly to local messages state.
      // This is the primary fix: previously payload.reply was fetched but
      // never surfaced to the user.
      const assistantMessage: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: "assistant",
        content: payload.reply,
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, assistantMessage]);

      await refreshSessions();

      // For new chats, update chatId so the sidebar highlights correctly.
      // Skip the message-loading effect since we already have the correct
      // messages in state (optimistic user msg + API reply).
      if (payload.chatId !== chatId) {
        skipNextMessageLoad.current = true;
        setChatId(payload.chatId);
      }
    } catch {
      // Rollback: remove the optimistic message and restore the user's input
      // so they can retry without losing their text.
      setMessages(messages);
      setInput(optimisticUserMessage.content);
      setError(t("ai.requestFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="stagger-children space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold">{t("ai.pageTitle")}</h2>
        <p className="text-sm text-muted-foreground">A compassionate, non-judgmental conversation partner.</p>
      </div>

      <CrisisHelpline />

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        {/* Sidebar */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("ai.conversations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full gap-2" onClick={createNewChat}>
              <MessageSquarePlus className="h-4 w-4" />
              {t("ai.newChat")}
            </Button>
            <div className="max-h-[420px] space-y-1.5 overflow-auto pr-1" aria-label={t("ai.sessionHistory")}>
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  aria-pressed={chatId === session.id}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    chatId === session.id
                      ? "border-emerald-400/40 bg-emerald-500/10 text-foreground shadow-sm"
                      : "border-border text-body hover:bg-surface"
                  }`}
                  onClick={() => setChatId(session.id)}
                >
                  <p className="line-clamp-1 font-medium">{session.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat pane */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {activeSessionTitle}
            </CardTitle>
            <CardDescription>{t("ai.assistantDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div
              className="flex max-h-[460px] flex-1 flex-col gap-3 overflow-auto rounded-2xl border border-border bg-surface-muted p-4"
              role="log"
              aria-live="polite"
              aria-label={t("ai.conversationLog")}
            >
              {loading ? (
                <p className="text-sm text-muted-foreground">{t("ai.loadingConversation")}</p>
              ) : null}
              {!loading && messages.length === 0 ? (
                <div className="my-auto flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Bot className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("ai.emptyState")}
                  </p>
                </div>
              ) : null}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-2.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                    message.role === "assistant"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                  }`}>
                    {message.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      message.role === "assistant"
                        ? "bg-surface text-foreground"
                        : "bg-emerald-600/15 text-emerald-50"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {sending && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
            {error ? (
              <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("ai.inputPlaceholder")}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <VoiceInput
                onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
              />
              <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="h-10 w-10 shrink-0">
                <Send className="h-4 w-4" />
                <span className="sr-only">{t("ai.send")}</span>
              </Button>
            </div>
            {/* Shown unconditionally rather than on first use: someone should
                know the audio may leave their device before they tap, not after. */}
            <p className="mt-1.5 text-xs text-subtle">{t("voice.notice")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
