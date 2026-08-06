import { describe, expect, it } from "vitest";

import { msUntilNext } from "@/lib/notifications";

describe("msUntilNext", () => {
  const at = (h: number, m: number) => new Date(2026, 7, 6, h, m, 0, 0);

  it("returns time until later today", () => {
    expect(msUntilNext("21:00", at(20, 0))).toBe(60 * 60 * 1000);
  });

  it("rolls over to tomorrow when the time has passed", () => {
    const ms = msUntilNext("09:00", at(20, 0));
    expect(ms).toBe(13 * 60 * 60 * 1000);
  });

  it("rolls over when the time is exactly now (never fires instantly)", () => {
    expect(msUntilNext("20:00", at(20, 0))).toBe(24 * 60 * 60 * 1000);
  });

  it("rejects a malformed time", () => {
    expect(msUntilNext("25:00", at(10, 0))).toBeNull();
    expect(msUntilNext("9pm", at(10, 0))).toBeNull();
    expect(msUntilNext("", at(10, 0))).toBeNull();
  });

  it("never returns a negative delay", () => {
    for (const t of ["00:00", "12:30", "23:59"]) {
      const ms = msUntilNext(t, at(13, 15));
      expect(ms).not.toBeNull();
      expect(ms as number).toBeGreaterThan(0);
    }
  });
});
