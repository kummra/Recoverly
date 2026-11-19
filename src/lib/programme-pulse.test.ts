import { describe, expect, it } from "vitest";

import { MIN_GROUP, ROUND_TO } from "@/lib/programme-count";
import { type PulseCounts, buildPulseRows, cleanPulseMonths, displayPulse, isPulseAnswer } from "@/lib/programme-pulse";
import { type PulseStore, recordPulse } from "@/lib/programme-pulse-service";
import type { Programme } from "@/lib/programme";

const NOW = new Date(2026, 10, 19, 9, 0);
const offers: Programme = { code: "ACMELOGI26", name: "Acme", kind: "workplace", welcome: { en: "Welcome to the Acme programme." }, contacts: [], headcount: true, pulse: true };

function memoryStore() {
  const added: Array<[string, string, number]> = [];
  const store: PulseStore = {
    async add(code, month, answer) {
      added.push([code, month, answer]);
    },
    async read() {
      return {};
    }
  };
  return { store, added };
}

describe("what counts as an answer", () => {
  it("is a whole number from 1 to 5, and nothing else", () => {
    for (const ok of [1, 2, 3, 4, 5]) expect(isPulseAnswer(ok)).toBe(true);
    for (const bad of [0, 6, -1, 2.5, "3", null, undefined, NaN, Infinity, [3], { a: 3 }, true]) expect(isPulseAnswer(bad), String(bad)).toBe(false);
  });
});

describe("what an organisation may be told", () => {
  it("shows nothing below the group size, at any mix of answers", () => {
    expect(displayPulse(undefined)).toEqual({ shown: false });
    expect(displayPulse([0, 0, 0, 0, MIN_GROUP - 1])).toEqual({ shown: false });
    expect(displayPulse([MIN_GROUP - 1, 0, 0, 0, 0])).toEqual({ shown: false });
  });

  it("shows, from the group size up, the number of answers rounded to 5, the share who agree rounded to 5 per cent, and the average to a tenth", () => {
    const counts: PulseCounts = [1, 2, 3, 8, 8]; // 22 answers; 16 agree = 72.7%; mean = (1+4+9+32+40)/22 = 3.909
    expect(displayPulse(counts)).toEqual({ shown: true, answers: 20, agreePercent: 75, average: 3.9 });
    expect(displayPulse([0, 0, 0, 0, MIN_GROUP])).toEqual({ shown: true, answers: 20, agreePercent: 100, average: 5 });
    expect(displayPulse([MIN_GROUP, 0, 0, 0, 0])).toEqual({ shown: true, answers: 20, agreePercent: 0, average: 1 });
    expect(ROUND_TO).toBe(5);
  });

  it("never rounds an answer count above 100 per cent", () => {
    const shown = displayPulse([0, 0, 0, 0, 22]);
    expect(shown).toMatchObject({ shown: true, agreePercent: 100 });
  });

  it("builds six months, newest first, each with its own group-size check", () => {
    const rows = buildPulseRows({ "2026-11": [0, 0, 0, 10, 14], "2026-10": [3, 1, 2, 4, 5] }, NOW);
    expect(rows.map((r) => r.month)).toEqual(["2026-11", "2026-10", "2026-09", "2026-08", "2026-07", "2026-06"]);
    expect(rows[0].display).toMatchObject({ shown: true, answers: 25, agreePercent: 100 });
    expect(rows[1].display).toEqual({ shown: false });
    expect(rows[2].display).toEqual({ shown: false });
  });
});

describe("reading what the database holds", () => {
  it("keeps only well-formed months and non-negative whole counts", () => {
    expect(cleanPulseMonths({ "2026-11": { a1: 2, a2: -4, a3: 1.9, a4: "x", a5: 7, extra: 9 }, junk: { a1: 1 }, "2026-10": "no", "2026-09": null })).toEqual({ "2026-11": [2, 0, 1, 0, 7] });
    expect(cleanPulseMonths(null)).toEqual({});
    expect(cleanPulseMonths([])).toEqual({});
  });
});

describe("recording an answer", () => {
  it("adds one to this month's count for that answer, and nothing else, for a programme that offers the survey", async () => {
    const { store, added } = memoryStore();
    expect(await recordPulse(store, offers, NOW, 4)).toEqual({ ok: true, month: "2026-11", recorded: true });
    expect(added).toEqual([["ACMELOGI26", "2026-11", 4]]);
  });

  it("answers 'not found' for a programme that does not offer the survey or the headcount, or does not exist, all the same way", async () => {
    const { store, added } = memoryStore();
    const missing = await recordPulse(store, null, NOW, 3);
    expect(missing).toEqual({ ok: false, status: 404, error: "not-found" });
    expect(await recordPulse(store, { ...offers, pulse: false }, NOW, 3)).toEqual(missing);
    expect(await recordPulse(store, { ...offers, headcount: false }, NOW, 3)).toEqual(missing);
    expect(added).toEqual([]);
  });

  it("refuses an answer that is not 1 to 5, without storing it", async () => {
    const { store, added } = memoryStore();
    for (const bad of [0, 6, 2.5, "4", null, undefined, { answer: 4 }]) expect(await recordPulse(store, offers, NOW, bad), String(bad)).toEqual({ ok: false, status: 400, error: "invalid" });
    expect(added).toEqual([]);
  });

  it("accepts an answer for the sample programme and stores nothing, so the choice can be tried", async () => {
    const { store, added } = memoryStore();
    const sample: Programme = { ...offers, code: "SAMPLE", kind: "sample" };
    expect(await recordPulse(store, sample, NOW, 5)).toEqual({ ok: true, month: "2026-11", recorded: false });
    expect(added).toEqual([]);
  });

  it("is a store that can only add one to a number and read numbers back: it cannot take or list a person", () => {
    const methods = Object.keys(memoryStore().store).sort();
    expect(methods).toEqual(["add", "read"]);
  });
});
