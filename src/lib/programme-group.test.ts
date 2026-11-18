import { describe, expect, it } from "vitest";

import { rollUpRows } from "@/lib/programme-group";
import { matchGroupKey } from "@/lib/programme-register";
import { createHash } from "node:crypto";

const NOW = new Date("2026-11-12T09:00:00Z");

describe("rollUpRows", () => {
  it("sums only districts that reach the group size on their own, using their rounded figures", () => {
    const rows = rollUpRows({ a: { "2026-10": 44 }, b: { "2026-10": 19 }, c: { "2026-10": 31 } }, NOW);
    const october = rows.find((r) => r.month === "2026-10")!;
    expect(october.display).toEqual({ shown: true, value: 45 + 30 });
    expect(october.districtsShown).toBe(2);
    expect(october.districtsTotal).toBe(3);
  });

  it("shows nothing for a month when no district reaches it, and never a small district's count", () => {
    const rows = rollUpRows({ a: { "2026-10": 7 }, b: { "2026-10": 12 } }, NOW);
    expect(rows.find((r) => r.month === "2026-10")!.display).toEqual({ shown: false });
    expect(JSON.stringify(rows)).not.toMatch(/\b(7|12)\b/);
  });
});

describe("matchGroupKey", () => {
  const token = "Q".repeat(43);
  const groups = [{ name: "North network", keyHash: createHash("sha256").update(token).digest("hex") }];
  it("finds the group for its key only", () => {
    expect(matchGroupKey(groups, token)?.name).toBe("North network");
    for (const bad of ["x".repeat(43), "", null, undefined, 5, `${token}x`]) expect(matchGroupKey(groups, bad)).toBeNull();
    expect(matchGroupKey([{ name: "x", keyHash: "nothex" }], token)).toBeNull();
  });
});
