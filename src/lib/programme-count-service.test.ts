import { describe, expect, it } from "vitest";

import type { Programme } from "@/lib/programme";
import { type CountStore, recordTick } from "@/lib/programme-count-service";
import { type OutcomeTotals } from "@/lib/programme-outcomes";

function memoryStore() {
  const totals = new Map<string, Record<string, number>>();
  const sums = new Map<string, Record<string, OutcomeTotals>>();
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
    },
    async addFigures(code, month, add) {
      calls.push(["addFigures", code, month, add]);
      const row = sums.get(code) ?? {};
      const was = row[month] ?? { n: 0, freePctSum: 0, lessOf: 0, lessN: 0 };
      row[month] = { n: was.n + add.n, freePctSum: was.freePctSum + add.freePctSum, lessOf: was.lessOf + add.lessOf, lessN: was.lessN + add.lessN };
      sums.set(code, row);
    },
    async readFigures(code) {
      calls.push(["readFigures", code]);
      return { ...(sums.get(code) ?? {}) };
    }
  };
  return { store, totals, sums, calls };
}

const NOW = new Date("2026-11-12T09:30:00Z");
const base: Programme = { code: "ACMELOGI26", name: "Acme", kind: "workplace", welcome: { en: "Welcome, everyone." }, contacts: [] };
const counting: Programme = { ...base, headcount: true };

describe("recordTick", () => {
  it("adds one to the programme's total for this month, and says which month", async () => {
    const { store, totals } = memoryStore();
    expect(await recordTick(store, counting, NOW)).toEqual({ ok: true, month: "2026-11", counted: true, figuresCounted: false });
    expect(await recordTick(store, counting, NOW)).toEqual({ ok: true, month: "2026-11", counted: true, figuresCounted: false });
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
    expect(await recordTick(store, sample, NOW)).toEqual({ ok: true, month: "2026-11", counted: false, figuresCounted: false });
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
  it("has a store that can only add to totals and sums and read them back", () => {
    const { store } = memoryStore();
    expect(Object.keys(store).sort()).toEqual(["addFigures", "increment", "read", "readFigures"]);
    expect(store.increment.length).toBe(2);
    expect(store.read.length).toBe(1);
    expect(store.addFigures.length).toBe(3);
    expect(store.readFigures.length).toBe(1);
  });

  it("passes the store a programme code and a month, and nothing else", async () => {
    const { store, calls } = memoryStore();
    await recordTick(store, counting, NOW);
    expect(calls).toEqual([["increment", "ACMELOGI26", "2026-11"]]);
  });

  it("answers with a month and whether it counted, and nothing about who sent it", async () => {
    const { store } = memoryStore();
    const result = await recordTick(store, counting, NOW);
    expect(Object.keys(result).sort()).toEqual(["counted", "figuresCounted", "month", "ok"]);
  });
});

describe("progress figures", () => {
  const offering: Programme = { ...counting, figures: true };
  const figures = { month: "2026-10", freeDayPct: 72, lessThanBefore: true };

  it("are added into the programme's running sums, for last month, and only as sums", async () => {
    const { store, sums, calls } = memoryStore();
    expect(await recordTick(store, offering, NOW, figures)).toEqual({ ok: true, month: "2026-11", counted: true, figuresCounted: true });
    await recordTick(store, offering, NOW, { month: "2026-10", freeDayPct: 40, lessThanBefore: null });
    await recordTick(store, offering, NOW, { month: "2026-10", freeDayPct: 90, lessThanBefore: false });
    expect(sums.get("ACMELOGI26")).toEqual({ "2026-10": { n: 3, freePctSum: 202, lessOf: 2, lessN: 1 } });
    // What the store was handed is a code, a month and four numbers: nobody.
    const added = calls.filter((c) => c[0] === "addFigures");
    expect(added[0]).toEqual(["addFigures", "ACMELOGI26", "2026-10", { n: 1, freePctSum: 72, lessOf: 1, lessN: 1 }]);
  });

  it("still count the person when the figures are refused, and are refused unless exactly last month's and well-formed", async () => {
    for (const bad of [{ ...figures, month: "2026-11" }, { ...figures, month: "2026-09" }, { ...figures, month: "2027-10" }, { ...figures, freeDayPct: 101 }, { ...figures, freeDayPct: -1 }, { ...figures, freeDayPct: 71.5 }, { ...figures, freeDayPct: "72" }, { ...figures, lessThanBefore: "yes" }, { month: "2026-10" }, "junk", 5, null, []]) {
      const { store, totals, sums } = memoryStore();
      const result = await recordTick(store, offering, NOW, bad);
      expect(result, JSON.stringify(bad)).toEqual({ ok: true, month: "2026-11", counted: true, figuresCounted: false });
      expect(totals.get("ACMELOGI26")).toEqual({ "2026-11": 1 });
      expect(sums.size).toBe(0);
    }
  });

  it("are ignored, quietly, by a programme that does not offer them", async () => {
    const { store, sums } = memoryStore();
    expect(await recordTick(store, counting, NOW, figures)).toEqual({ ok: true, month: "2026-11", counted: true, figuresCounted: false });
    expect(sums.size).toBe(0);
  });

  it("are not stored for the sample programme, which stores nothing", async () => {
    const { store, calls } = memoryStore();
    await recordTick(store, { ...offering, code: "SAMPLE", kind: "sample" }, NOW, figures);
    expect(calls).toEqual([]);
  });

  it("use the server's month, so a device cannot back-fill or invent one", async () => {
    const { store, sums } = memoryStore();
    // 19:00 UTC on 30 November is already December in India: the figures must be November's.
    await recordTick(store, offering, new Date("2026-11-30T19:00:00Z"), { month: "2026-11", freeDayPct: 50, lessThanBefore: null });
    expect(sums.get("ACMELOGI26")).toEqual({ "2026-11": { n: 1, freePctSum: 50, lessOf: 0, lessN: 0 } });
  });
});
