import { describe, expect, it } from "vitest";

import { LIMITS, rateLimit } from "@/lib/rate-limit";

const key = () => `test-${Math.random().toString(36).slice(2)}`;

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const k = key();
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(k, 5, 60_000).allowed).toBe(true);
    }
  });

  it("blocks once the limit is exceeded", () => {
    const k = key();
    for (let i = 0; i < 3; i++) rateLimit(k, 3, 60_000);
    const blocked = rateLimit(k, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("keeps separate callers independent", () => {
    const a = key();
    const b = key();
    for (let i = 0; i < 3; i++) rateLimit(a, 3, 60_000);
    expect(rateLimit(a, 3, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 3, 60_000).allowed).toBe(true);
  });

  it("resets after the window elapses", () => {
    const k = key();
    rateLimit(k, 1, 1); // 1ms window
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rateLimit(k, 1, 1).allowed).toBe(true);
        resolve();
      }, 10);
    });
  });

  it("every configured limit is positive and bounded", () => {
    for (const [name, cfg] of Object.entries(LIMITS)) {
      expect(cfg.limit, name).toBeGreaterThan(0);
      expect(cfg.windowMs, name).toBeGreaterThan(0);
    }
  });
});
