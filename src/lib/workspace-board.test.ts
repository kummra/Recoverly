import { describe, expect, it } from "vitest";

import { type BoardEntry, orderForBoard } from "@/lib/workspace-board";

const entry = (id: string, updatedAt: number, contact?: { note: string }): BoardEntry => ({
  id,
  updatedAt,
  expiresAt: updatedAt + 1,
  snapshot: { v: 1, createdAt: "2026-11-12T00:00:00.000Z", ...(contact ? { contact } : {}) }
});

describe("orderForBoard", () => {
  it("puts people who asked to be contacted first, then everyone by most recent update", () => {
    const ordered = orderForBoard([entry("a", 300), entry("b", 100, { note: "evenings" }), entry("c", 200), entry("d", 400, { note: "" })]);
    expect(ordered.map((e) => e.id)).toEqual(["d", "b", "a", "c"]);
  });

  it("does not change the list it was given", () => {
    const list = [entry("a", 1), entry("b", 2)];
    orderForBoard(list);
    expect(list.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
