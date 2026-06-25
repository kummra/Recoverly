/**
 * Deterministic, provider-agnostic safety helpers for the recovery AI.
 *
 * The AI system prompt also instructs the model to handle crisis language, but
 * models can miss things. This module is the *deterministic* safety net: if a
 * user's message matches crisis language, the app guarantees a real helpline is
 * shown — even if the model's reply omits it, or the model call fails entirely.
 *
 * This file is intentionally free of server-only imports so it can be used in
 * both the API route (server) and UI components (client).
 */

/** Crisis / self-harm language patterns. Tuned to favour catching real distress. */
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+myself\b/i,
  /\bsuicid/i, // suicide, suicidal
  /\bself[-\s]?harm/i,
  /\b(harm|hurt|cut)\s+myself\b/i,
  /\bwant(ing)?\s+to\s+die\b/i,
  /\bend\s+(my\s+life|it\s+all|myself)\b/i,
  /\btake\s+my\s+(own\s+)?life\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+(alive|here))\b/i,
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living|life)\b/i,
  /\b(better\s+off|everyone.*better)\s+(dead|without\s+me)\b/i,
  /\bcan'?t\s+(go\s+on|do\s+this\s+anymore|take\s+it\s+anymore)\b/i,
  /\boverdose\b/i,
];

/** Returns true if the text contains self-harm / suicide / crisis language. */
export function detectCrisis(text: string | null | undefined): boolean {
  if (!text) return false;
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

/** Helpline data — single source of truth, shared by the server and the UI. */
export const HELPLINES = {
  india: {
    teleManas: "14416", // also 1-800-891-4416
    teleManasAlt: "1-800-891-4416",
    kiran: "1800-599-0019",
    emergency: "112",
  },
  internationalDirectoryUrl: "https://findahelpline.com",
} as const;

/**
 * The exact help message the AI route injects whenever crisis language is
 * detected. Plain text (the chat renders with `whitespace-pre-wrap`).
 */
export const CRISIS_HELP_MESSAGE = `I'm really glad you told me, and I want to make sure you're safe. If you might be in danger or thinking about harming yourself, please reach out to someone who can help right now — you don't have to carry this alone.

India:
• Tele-MANAS (24/7 mental health): ${HELPLINES.india.teleManas} or ${HELPLINES.india.teleManasAlt}
• KIRAN helpline (24/7): ${HELPLINES.india.kiran}
• Emergency services: ${HELPLINES.india.emergency}

Outside India:
• Find a local helpline: ${HELPLINES.internationalDirectoryUrl}
• Or call your local emergency number.

If you can, please also reach out to someone you trust. I'm here to keep talking with you.`;
