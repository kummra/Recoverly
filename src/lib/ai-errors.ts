/**
 * What went wrong with a coach request, in terms a person can act on.
 *
 * The coach depends on an outside provider whose limits and model names change
 * without notice (one model was withdrawn and the coach was down until it was
 * noticed). "Could not get AI response" gave no next step. A busy provider and
 * a broken one call for different advice, and in both cases someone reaching
 * out in a hard moment needs to be pointed at help that does not depend on it.
 *
 * Free of server-only imports: the route classifies, the page reads the result.
 */

export type AiFailureKind = "busy" | "unavailable";

/** The page also has "generic" for anything it cannot place. */
export type AiFailureDisplay = AiFailureKind | "generic";

/** Provider (Groq) errors carry the HTTP status of the refused request. */
export function classifyAiFailure(error: unknown): AiFailureKind {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  return status === 429 ? "busy" : "unavailable";
}

export const AI_FAILURE_STATUS: Record<AiFailureKind, number> = {
  busy: 429,
  unavailable: 503
};

/** One line for the server log. Logging the whole error object printed the
 *  provider's response headers and cookies, which buried the useful part. */
export function describeAiError(error: unknown): string {
  const e = error as { status?: unknown; message?: unknown; error?: { error?: { code?: unknown } } } | null | undefined;
  const status = typeof e?.status === "number" ? e.status : "no-status";
  const code = typeof e?.error?.error?.code === "string" ? e.error.error.code : "no-code";
  const message = typeof e?.message === "string" ? e.message.slice(0, 300) : String(error).slice(0, 300);
  return `status=${status} code=${code} message=${message}`;
}

/** Decide what the page should say from the HTTP status and JSON body it got. */
export function failureFromResponse(status: number, body: unknown): AiFailureDisplay {
  const code = (body as { code?: unknown } | null | undefined)?.code;
  if (code === "busy" || status === 429) return "busy";
  if (code === "unavailable" || status >= 500) return "unavailable";
  return "generic";
}
