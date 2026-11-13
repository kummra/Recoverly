import { describe, expect, it } from "vitest";

import type { Programme } from "@/lib/programme";
import { type CountStore, recordTick } from "@/lib/programme-count-service";

function memoryStore() {
  const totals = new Map<string, Record<string, number>>();
  const calls: Array<[string, ...unknown[]]> = [];
  const store: CountStore = {
    async increment(code, month) {
      calls.push(["increment", code, month]);
      const row = totals.get(code) ?? {};
      row[month] = (row[month] ?? 0) + 1;
      totals.set(code, row);
    },
    async read(code) {
      calls.push(["read", code]);
      return { ...(totals.get(code) ?? {}) };
    }
  };
  return { store, totals, calls };
}

const NOW = new Date("2026-11-12T09:30:00Z");
const base: Programme = { code: "ACMELOGI26", name: "Acme", kind: "workplace", welcome: { en: "Welcome, everyone." }, contacts: [] };
const counting: Programme = { ...base, headcount: true };

describe("recordTick", () => {
  it("adds one to the programme's total for this month, and says which month", async () => {
    const { store, totals } = memoryStore();
    expect(await recordTick(store, counting, NOW)).toEqual({ ok: true, month: "2026-11", counted: true });
    expect(await recordTick(store, counting, NOW)).toEqual({ ok: true, month: "2026-11", counted: true });
    expect(totals.get("ACMELOGI26")).toEqual({ "2026-11": 2 });
  });

  it("counts into the month the server says it is, never one a device names", async () => {
    const { store, totals } = memoryStore();
    await recordTick(store, counting, new Date("2026-12-31T19:00:00Z"));
    expect(totals.get("ACMELOGI26")).toEqual({ "2027-01": 1 });
  });

  it("does not count a programme that has not agreed to the headcount, and answers as if it did not exist", async () => {
    const { store, calls } = memoryStore();
    expect(await recordTick(store, base, NOW)).toEqual({ ok: false, status: 404, error: "not-found" });
    expect(await recordTick(store, { ...base, headcount: false }, NOW)).toEqual({ ok: false, status: 404, error: "not-found" });
    expect(await recordTick(store, null, NOW)).toEqual({ ok: false, status: 404, error: "not-found" });
    expect(calls).toEqual([]);
  });

  it("accepts a tick for the sample programme and stores nothing, so trying the choice leaves nothing behind", async () => {
    const { store, calls } = memoryStore();
    const sample: Programme = { ...counting, code: "SAMPLE", kind: "sample" };
    expect(await recordTick(store, sample, NOW)).toEqual({ ok: true, month: "2026-11", counted: false });
    expect(calls).toEqual([]);
  });

  it("keeps each programme's total to itself", async () => {
    const { store, totals } = memoryStore();
    await recordTick(store, counting, NOW);
    await recordTick(store, { ...counting, code: "OTHERORG26" }, NOW);
    expect([...totals.keys()].sort()).toEqual(["ACMELOGI26", "OTHERORG26"]);
  });
});

/**
 * The design is that the headcount is a number and cannot become a list. These pin it:
 * the store can only add one to a total and read totals, and nothing about a person is
 * ever an argument to either. Changing this is a decision about firm rule 4, not a refactor.
 */
describe("the headcount cannot become a list of people", () => {
  it("has a store that can only increment a total and read totals", () => {
    const { store } = memoryStore();
    expect(Object.keys(store).sort()).toEqual(["increment", "read"]);
    expect(store.increment.length).toBe(2);
    expect(store.read.length).toBe(1);
  });

  it("passes the store a programme code and a month, and nothing else", async () => {
    const { store, calls } = memoryStore();
    await recordTick(store, counting, NOW);
    expect(calls).toEqual([["increment", "ACMELOGI26", "2026-11"]]);
  });

  it("answers with a month and whether it counted, and nothing about who sent it", async () => {
    const { store } = memoryStore();
    const result = await recordTick(store, counting, NOW);
    expect(Object.keys(result).sort()).toEqual(["counted", "month", "ok"]);
  });
});
