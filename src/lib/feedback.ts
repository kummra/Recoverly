/**
 * "What would help you most?": the in-app survey that tells the team which of
 * the services in the business plan people actually want, before anything is
 * built. None of these services exist yet, and the screen says so.
 *
 * Shared by the form and the route. Free of server-only imports.
 */
import { z } from "zod";

export const FEEDBACK_INTERESTS = ["counsellor", "group", "family", "courses"] as const;
export type FeedbackInterest = (typeof FEEDBACK_INTERESTS)[number];

export const MAX_FEEDBACK_MESSAGE = 300;

/** Empty text from a form means "nothing written". */
const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(MAX_FEEDBACK_MESSAGE).optional()
);

export const feedbackSchema = z.object({
  interests: z.array(z.enum(FEEDBACK_INTERESTS)).max(FEEDBACK_INTERESTS.length),
  message: optionalText
});

export type Feedback = { interests: FeedbackInterest[]; message?: string };

export type ParsedFeedback = { ok: true; data: Feedback } | { ok: false };

/** Valid when it says something: at least one choice, or a message. */
export function parseFeedback(input: unknown): ParsedFeedback {
  const result = feedbackSchema.safeParse(input);
  if (!result.success) return { ok: false };
  const interests = [...new Set(result.data.interests)];
  const message = result.data.message;
  if (interests.length === 0 && !message) return { ok: false };
  return { ok: true, data: { interests, message } };
}

/** What is stored, under the person's own account. */
export function feedbackToDocument(data: Feedback, now: Date) {
  return { interests: data.interests, message: data.message ?? null, createdAt: now };
}
