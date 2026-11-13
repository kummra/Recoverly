/**
 * Lightweight in-memory rate limiter for the API routes.
 *
 * Why this matters here: /api/ai spends real money per call. Without a limit,
 * one abusive account can burn the Groq quota and take the coach offline for
 * everyone — including someone reaching out in crisis. Availability is a safety
 * property in this app, not just a cost concern.
 *
 * Scope, honestly: this is per serverless instance, so it is a strong brake on
 * a single hot client rather than a global guarantee. It needs no extra
 * infrastructure. If the app ever needs a hard global cap, move this to a
 * shared store (Upstash/Redis) behind the same interface.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

/** Stop the map growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the window resets — surfaced as Retry-After. */
  retryAfter: number;
};

/**
 * Fixed-window limiter. `key` should identify the caller (uid or device id),
 * never the raw IP alone, so shared networks aren't punished together.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfter: 0 };
}

/** Consistent 429 shape, including the header clients actually respect. */
export function tooManyRequests(retryAfter: number) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
    {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) }
    }
  );
}

/** Tuned per route: generous for humans, tight enough to stop a runaway loop. */
export const LIMITS = {
  ai: { limit: 20, windowMs: 60_000 },
  deviceIngest: { limit: 120, windowMs: 60_000 },
  sobriety: { limit: 60, windowMs: 60_000 },
  deviceRegister: { limit: 10, windowMs: 60 * 60_000 },
  accountDelete: { limit: 5, windowMs: 60 * 60_000 },
  ociSync: { limit: 200, windowMs: 60_000 },
  // Public form with no sign-in: the only handle on a caller is their address,
  // so the per-caller limit is small and there is a ceiling on the whole route.
  partners: { limit: 5, windowMs: 60 * 60_000 },
  partnersAll: { limit: 200, windowMs: 60 * 60_000 },
  // Signed in, so per person: more than a few a day is not feedback.
  feedback: { limit: 5, windowMs: 60 * 60_000 },
  // Looking up a programme code. Generous per address on purpose: a whole office
  // scans the same poster in the same hour from one shared connection, and a limit
  // that turned colleagues away would fail exactly the workshop it was made for.
  // Guessing is made pointless by the codes (6+ letters and digits), not by this.
  programme: { limit: 600, windowMs: 60 * 60_000 },
  programmeAll: { limit: 6000, windowMs: 60 * 60_000 },
  // The public helplines feed and the embeddable card: small, cacheable, no personal data.
  // Per address, and generous, because a partner's office or app can share one.
  helplines: { limit: 600, windowMs: 60 * 60_000 },
  // Summary links. Making one is rare; the list is read when the page opens.
  shareCreate: { limit: 10, windowMs: 60 * 60_000 },
  shareManage: { limit: 120, windowMs: 60 * 60_000 },
  // Opening one. A clinic's front desk may share an address, so this is generous;
  // guessing is pointless (the address is 128 random bits and the key is not here).
  shareRead: { limit: 120, windowMs: 60 * 60_000 },
  shareReadAll: { limit: 6000, windowMs: 60 * 60_000 },
  // The once-a-month "I used it" tick for an organisation's anonymous total. A
  // device sends one a month, so a dozen an hour per person is already generous.
  programmeCount: { limit: 12, windowMs: 60 * 60_000 },
  // An organisation's private report page.
  reportView: { limit: 60, windowMs: 60 * 60_000 }
} as const;
