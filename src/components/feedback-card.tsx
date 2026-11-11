"use client";

import { useState } from "react";
import { AlertCircle, Check, MessageSquareHeart } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { FEEDBACK_INTERESTS, type FeedbackInterest, MAX_FEEDBACK_MESSAGE } from "@/lib/feedback";

const INTEREST_KEYS: Record<FeedbackInterest, string> = {
  counsellor: "feedback.counsellor",
  group: "feedback.group",
  family: "feedback.family",
  courses: "feedback.courses"
};

type Status = "idle" | "sending" | "sent" | "failed" | "empty";

/**
 * "Help us decide what to build." The team plans services (counselling, groups,
 * family support, courses) that do not exist yet. Asking the people the app
 * already serves, before building, is the cheapest evidence of what is wanted,
 * and a chance to say anything else.
 *
 * It says plainly that none of this is available: a person in a hard moment who
 * thinks help is a tap away, and finds it is not, has been let down. Their answer
 * is kept with their account and deleted with it (see `app/api/feedback`).
 */
export function FeedbackCard() {
  const t = useT();
  const { getIdToken } = useAuth();
  const [picked, setPicked] = useState<FeedbackInterest[]>([]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const toggle = (interest: FeedbackInterest) => {
    setStatus("idle");
    setPicked((current) => (current.includes(interest) ? current.filter((i) => i !== interest) : [...current, interest]));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;
    if (picked.length === 0 && message.trim() === "") {
      setStatus("empty");
      return;
    }
    setStatus("sending");
    try {
      const token = await getIdToken();
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ interests: picked, message })
      });
      if (!response.ok) {
        setStatus("failed");
        return;
      }
      setPicked([]);
      setMessage("");
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareHeart className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
          {t("feedback.title")}
        </CardTitle>
        <CardDescription>{t("feedback.intro")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <fieldset className="space-y-2">
            <legend className="sr-only">{t("feedback.title")}</legend>
            {FEEDBACK_INTERESTS.map((interest) => (
              <label
                key={interest}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm text-body hover:bg-surface-muted"
              >
                <input
                  type="checkbox"
                  checked={picked.includes(interest)}
                  onChange={() => toggle(interest)}
                  className="h-4 w-4 shrink-0 rounded border-input accent-emerald-600"
                />
                {t(INTEREST_KEYS[interest])}
              </label>
            ))}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">{t("feedback.messageLabel")}</Label>
            <Textarea
              id="feedback-message"
              value={message}
              maxLength={MAX_FEEDBACK_MESSAGE}
              rows={3}
              onChange={(event) => {
                setMessage(event.target.value);
                setStatus("idle");
              }}
            />
          </div>

          <Button type="submit" disabled={status === "sending"}>
            {t("feedback.send")}
          </Button>

          {status === "sent" && (
            <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t("feedback.thanks")}
            </p>
          )}
          {(status === "failed" || status === "empty") && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t(status === "failed" ? "feedback.failed" : "feedback.pick")}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
