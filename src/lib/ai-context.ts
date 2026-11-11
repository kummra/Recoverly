/**
 * Keeps a conversation small enough to send to the coach.
 *
 * Why this exists: the coach runs on a provider plan that allows about 8,000
 * tokens a minute for the whole app, shared by everyone. A request that is over
 * that on its own is refused every time, not just once, and the app used to
 * send up to the last 50 messages with each question. A long-running chat would
 * work for weeks and then simply stop working. The newest messages matter most
 * to a reply, so the oldest are dropped first.
 *
 * Free of server-only imports so it can be unit tested and shared.
 */

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Tokens per character, measured on the coach's model with real app text:
 * English 0.19, Hindi 0.41, Marathi 0.53, Tamil 0.50, Malayalam 0.58,
 * Telugu 0.61, Kannada 0.65, Gujarati 0.69, Punjabi 0.81. The estimate leans
 * high on purpose: too small a number is what lets a request go over the limit.
 */
const TOKENS_PER_ASCII_CHAR = 0.27;
const TOKENS_PER_OTHER_CHAR = 0.85;
/** The role marker and template around every message. */
const TOKENS_PER_MESSAGE = 6;

/** What the conversation (not the fixed instructions) may use in one request. */
export const CONTEXT_TOKEN_BUDGET = 3000;

export function estimateTokens(text: string): number {
  let ascii = 0;
  let other = 0;
  for (const ch of text) {
    if ((ch.codePointAt(0) ?? 0) < 128) ascii += 1;
    else other += 1;
  }
  return Math.ceil(ascii * TOKENS_PER_ASCII_CHAR + other * TOKENS_PER_OTHER_CHAR) + TOKENS_PER_MESSAGE;
}

/**
 * The most recent messages that fit the budget, oldest first.
 *
 * The newest message is always kept, even if it alone is over budget: dropping
 * what the person just said would make the reply answer something else.
 */
export function trimToTokenBudget<T extends ChatTurn>(messages: T[], budget: number = CONTEXT_TOKEN_BUDGET): T[] {
  const kept: T[] = [];
  let used = 0;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const cost = estimateTokens(messages[i].content);
    if (kept.length > 0 && used + cost > budget) break;
    kept.unshift(messages[i]);
    used += cost;
  }

  // Begin on something the person said. A conversation that opens with a reply
  // to a question the model can no longer see is a strange thing to continue.
  while (kept.length > 1 && kept[0].role === "assistant") kept.shift();

  return kept;
}
