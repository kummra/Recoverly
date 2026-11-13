import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Programme } from "@/lib/programme";
import { loadMembership, saveProgramme, setCounted } from "@/lib/programme-membership";
import { sendTick, tickIfDue } from "@/lib/programme-headcount";

const OFFERS: Programme = {
  code: "ACMELOGI26",
  name: "Acme Logistics",
  kind: "workplace",
  welcome: { en: "Welcome. Our people matter to us." },
  contacts: [],
  headcount: true
};
const SILENT: Programme = { ...OFFERS, headcount: undefined };
const WITH_FIGURES: Programme = { ...OFFERS, figures: true };
const FIGURES = { month: "2026-10", freeDayPct: 72, lessThanBefore: true };

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key)
  };
}

const USER = "uid-1";
const NOW = new Date("2026-11-12T09:30:00Z");
const ok = () => new Response("{}", { status: 200 });

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: fakeStorage(), dispatchEvent: () => true });
});
afterEach(() => vi.unstubAllGlobals());

describe("tickIfDue", () => {
  it("sends nothing for someone who has not ticked the box, however often they open the app", async () => {
    saveProgramme(USER, OFFERS);
    const fetchImpl = vi.fn(async () => ok());
    for (let i = 0; i < 5; i++) expect(await tickIfDue(USER, async () => "token", { now: NOW, fetchImpl })).toBe("off");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends nothing for a person in no programme, or one that does not offer the headcount", async () => {
    const fetchImpl = vi.fn(async () => ok());
    expect(await tickIfDue(USER, async () => "token", { now: NOW, fetchImpl })).toBe("off");
    saveProgramme(USER, SILENT, { counted: true });
    expect(loadMembership(USER)?.counted).toBe(false);
    expect(await tickIfDue(USER, async () => "token", { now: NOW, fetchImpl })).toBe("off");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends the programme's code, signed in, and nothing else, once a month", async () => {
    saveProgramme(USER, OFFERS, { counted: true });
    const fetchImpl = vi.fn(async () => ok());
    expect(await tickIfDue(USER, async () => "the-token", { now: NOW, fetchImpl })).toBe("sent");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/programme/count");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ code: "ACMELOGI26" });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer the-token");
    // Nothing about the person is in the request but the signed-in header.
    expect(init.body).not.toMatch(/uid|email|name|record/i);

    // Opened again, even many times, the same month: not sent again.
    for (let i = 0; i < 4; i++) expect(await tickIfDue(USER, async () => "the-token", { now: new Date("2026-11-20T09:00:00Z"), fetchImpl })).toBe("not-due");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sends again in the next month", async () => {
    saveProgramme(USER, OFFERS, { counted: true });
    const fetchImpl = vi.fn(async () => ok());
    await tickIfDue(USER, async () => "t", { now: NOW, fetchImpl });
    expect(await tickIfDue(USER, async () => "t", { now: new Date("2026-12-02T09:00:00Z"), fetchImpl })).toBe("sent");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("tries again next time when the tick does not get through, rather than skipping the month", async () => {
    saveProgramme(USER, OFFERS, { counted: true });
    const failing = vi.fn(async () => new Response("{}", { status: 503 }));
    expect(await tickIfDue(USER, async () => "t", { now: NOW, fetchImpl: failing })).toBe("failed");
    expect(loadMembership(USER)?.countedMonth).toBeNull();
    const throwing = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await tickIfDue(USER, async () => "t", { now: NOW, fetchImpl: throwing })).toBe("failed");
    expect(await tickIfDue(USER, async () => "t", { now: NOW, fetchImpl: vi.fn(async () => ok()) })).toBe("sent");
  });

  it("does not send without a sign-in, and does not use up the month", async () => {
    saveProgramme(USER, OFFERS, { counted: true });
    const fetchImpl = vi.fn(async () => ok());
    expect(await tickIfDue(USER, async () => null, { now: NOW, fetchImpl })).toBe("failed");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(loadMembership(USER)?.countedMonth).toBeNull();
  });

  it("does not send a second tick when another tab opens at the same moment", async () => {
    saveProgramme(USER, OFFERS, { counted: true });
    let release: () => void = () => undefined;
    const slow = vi.fn(() => new Promise<Response>((resolve) => (release = () => resolve(ok()))));
    const first = tickIfDue(USER, async () => "t", { now: NOW, fetchImpl: slow });
    // The first is still in flight; a second caller sees the month taken.
    await Promise.resolve();
    await Promise.resolve();
    const second = await tickIfDue(USER, async () => "t", { now: NOW, fetchImpl: slow });
    release();
    expect(await first).toBe("sent");
    expect(second).toBe("not-due");
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it("stops at once when the person unticks, and starts afresh if they tick again", async () => {
    saveProgramme(USER, OFFERS, { counted: true });
    const fetchImpl = vi.fn(async () => ok());
    await tickIfDue(USER, async () => "t", { now: NOW, fetchImpl });
    setCounted(USER, false);
    expect(await tickIfDue(USER, async () => "t", { now: new Date("2026-12-05T09:00:00Z"), fetchImpl })).toBe("off");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    setCounted(USER, true);
    expect(await tickIfDue(USER, async () => "t", { now: new Date("2026-12-05T09:00:00Z"), fetchImpl })).toBe("sent");
  });

  it("stops when the organisation stops offering the headcount", async () => {
    saveProgramme(USER, OFFERS, { counted: true });
    // The dashboard refreshes the programme from the server; it no longer offers the headcount.
    saveProgramme(USER, SILENT);
    expect(loadMembership(USER)?.counted).toBe(false);
    const fetchImpl = vi.fn(async () => ok());
    expect(await tickIfDue(USER, async () => "t", { now: NOW, fetchImpl })).toBe("off");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("sendTick", () => {
  it("treats a refusal as 'not counted' without throwing, and a 404 as done for the month", async () => {
    expect(await sendTick("ACMELOGI26", "t", async () => new Response("{}", { status: 200 }))).toBe(true);
    expect(await sendTick("ACMELOGI26", "t", async () => new Response("{}", { status: 404 }))).toBe(true);
    expect(await sendTick("ACMELOGI26", "t", async () => new Response("{}", { status: 429 }))).toBe(false);
    expect(await sendTick("ACMELOGI26", "t", async () => new Response("{}", { status: 401 }))).toBe(false);
    expect(await sendTick("ACMELOGI26", "t", async () => Promise.reject(new Error("offline")))).toBe(false);
  });

  describe("with progress figures", () => {
    it("sends them with the tick, and only if the person chose to share them", async () => {
      saveProgramme(USER, WITH_FIGURES, { counted: true, figures: true });
      const fetchImpl = vi.fn(async () => ok());
      const loadFigures = vi.fn(async () => FIGURES);
      expect(await tickIfDue(USER, async () => "t", { now: NOW, fetchImpl, loadFigures })).toBe("sent");
      expect(loadFigures).toHaveBeenCalledTimes(1);
      const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({ code: "ACMELOGI26", figures: FIGURES });
    });

    it("never reads the records, or sends anything extra, when figures are not chosen", async () => {
      saveProgramme(USER, WITH_FIGURES, { counted: true });
      const fetchImpl = vi.fn(async () => ok());
      const loadFigures = vi.fn(async () => FIGURES);
      await tickIfDue(USER, async () => "t", { now: NOW, fetchImpl, loadFigures });
      expect(loadFigures).not.toHaveBeenCalled();
      expect(JSON.parse(((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body) as string)).toEqual({ code: "ACMELOGI26" });
    });

    it("still counts the person if the figures cannot be worked out, and sends none when there is too little history", async () => {
      saveProgramme(USER, WITH_FIGURES, { counted: true, figures: true });
      const fetchImpl = vi.fn(async () => ok());
      expect(await tickIfDue(USER, async () => "t", { now: NOW, fetchImpl, loadFigures: async () => Promise.reject(new Error("database down")) })).toBe("sent");
      expect(JSON.parse(((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body) as string)).toEqual({ code: "ACMELOGI26" });

      saveProgramme("u-new", WITH_FIGURES, { counted: true, figures: true });
      const second = vi.fn(async () => ok());
      await tickIfDue("u-new", async () => "t", { now: NOW, fetchImpl: second, loadFigures: async () => null });
      expect(JSON.parse(((second.mock.calls[0] as unknown as [string, RequestInit])[1].body) as string)).toEqual({ code: "ACMELOGI26" });
    });
  });
});
