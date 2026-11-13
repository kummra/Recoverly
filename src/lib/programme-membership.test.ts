import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Programme } from "@/lib/programme";
import {
  PENDING_CODE_KEY,
  clearPendingCode,
  clearProgramme,
  loadMembership,
  loadPendingCode,
  loadProgramme,
  lookupProgramme,
  markCountedMonth,
  setFigures,
  parseStoredMembership,
  parseStoredProgramme,
  programmeStorageKey,
  saveProgramme,
  savePendingCode,
  setCounted
} from "@/lib/programme-membership";

const PROGRAMME: Programme = {
  code: "ACMELOGI26",
  name: "Acme Logistics",
  kind: "workplace",
  welcome: { en: "Welcome. Our people matter to us." },
  contacts: [{ label: "Employee assistance line", phone: "18005550123" }]
};

/** A stand-in for the browser's storage that can also refuse to store. */
function fakeStorage(options: { refuseWrites?: boolean } = {}) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (options.refuseWrites) throw new Error("QuotaExceededError");
      data.set(key, value);
    },
    removeItem: (key: string) => void data.delete(key)
  };
}

describe("parseStoredProgramme", () => {
  it("reads what saveProgramme wrote", () => {
    expect(parseStoredProgramme(JSON.stringify({ programme: PROGRAMME }))).toEqual(PROGRAMME);
  });

  it("treats anything unreadable as nothing", () => {
    for (const bad of [null, "", "not json", "null", "[]", "{}", JSON.stringify({ programme: "x" }), JSON.stringify({ programme: { ...PROGRAMME, kind: "casino" } })]) {
      expect(parseStoredProgramme(bad), String(bad)).toBeNull();
    }
  });

  it("does not trust a hand-edited link", () => {
    const edited = { programme: { ...PROGRAMME, contacts: [{ label: "Line", url: "javascript:alert(1)", phone: "112" }] } };
    expect(parseStoredProgramme(JSON.stringify(edited))?.contacts).toEqual([{ label: "Line", phone: "112" }]);
  });
});

describe("storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: fakeStorage() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps a programme per person, under its own key", () => {
    expect(programmeStorageKey("u1")).toBe("recoverly:programme:u1");
    expect(saveProgramme("u1", PROGRAMME)).toBe(true);
    expect(loadProgramme("u1")).toEqual(PROGRAMME);
    expect(loadProgramme("u2")).toBeNull();
  });

  it("forgets a programme on request", () => {
    saveProgramme("u1", PROGRAMME);
    clearProgramme("u1");
    expect(loadProgramme("u1")).toBeNull();
  });

  it("says so when the browser refuses to store, instead of pretending", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage({ refuseWrites: true }) });
    expect(saveProgramme("u1", PROGRAMME)).toBe(false);
    expect(savePendingCode("ACMELOGI26")).toBe(false);
  });

  it("never throws when storage is unavailable", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("blocked");
      }
    });
    expect(loadProgramme("u1")).toBeNull();
    expect(loadPendingCode()).toBeNull();
    expect(saveProgramme("u1", PROGRAMME)).toBe(false);
    expect(() => clearProgramme("u1")).not.toThrow();
    expect(() => clearPendingCode()).not.toThrow();
  });

  it("holds one pending code, normalised, until it is cleared", () => {
    expect(savePendingCode("acme-logi 26")).toBe(true);
    expect(loadPendingCode()).toBe("ACMELOGI26");
    clearPendingCode();
    expect(loadPendingCode()).toBeNull();
  });

  it("refuses to hold something that is not a code", () => {
    expect(savePendingCode("<script>")).toBe(false);
    expect(loadPendingCode()).toBeNull();
  });

  it("ignores a junk pending value", () => {
    (window.localStorage as unknown as ReturnType<typeof fakeStorage>).data.set(PENDING_CODE_KEY, "javascript:alert(1)");
    expect(loadPendingCode()).toBeNull();
  });
});

describe("lookupProgramme", () => {
  const respond = (status: number, body?: unknown) => vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));

  it("asks for the normalised code and sends nothing else with it", async () => {
    const fetchImpl = respond(200, { programme: PROGRAMME });
    const result = await lookupProgramme("acme logi-26", { fetchImpl });
    expect(result).toEqual({ ok: true, programme: PROGRAMME });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/programme?code=ACMELOGI26");
    expect(init.credentials).toBe("omit");
    expect(init.method).toBeUndefined(); // a plain GET: no body, nothing about the person
  });

  it("does not ask at all for something that is not a code", async () => {
    const fetchImpl = respond(200, { programme: PROGRAMME });
    expect(await lookupProgramme("no", { fetchImpl })).toEqual({ ok: false, reason: "invalid" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("tells the different failures apart", async () => {
    expect(await lookupProgramme("ACMELOGI26", { fetchImpl: respond(404, { error: "not-found" }) })).toEqual({ ok: false, reason: "not-found" });
    expect(await lookupProgramme("ACMELOGI26", { fetchImpl: respond(400, { error: "invalid" }) })).toEqual({ ok: false, reason: "invalid" });
    expect(await lookupProgramme("ACMELOGI26", { fetchImpl: respond(429) })).toEqual({ ok: false, reason: "busy" });
    expect(await lookupProgramme("ACMELOGI26", { fetchImpl: respond(500) })).toEqual({ ok: false, reason: "network" });
    expect(await lookupProgramme("ACMELOGI26", { fetchImpl: vi.fn(async () => Promise.reject(new Error("offline"))) })).toEqual({ ok: false, reason: "network" });
  });

  it("does not accept an answer it cannot use, or one for a different code", async () => {
    expect(await lookupProgramme("ACMELOGI26", { fetchImpl: respond(200, { programme: { nonsense: true } }) })).toEqual({ ok: false, reason: "network" });
    expect(await lookupProgramme("ACMELOGI26", { fetchImpl: respond(200, { programme: { ...PROGRAMME, code: "SOMETHINGELSE" } }) })).toEqual({ ok: false, reason: "network" });
  });

  it("cleans what the server sent before handing it over", async () => {
    const dirty = { ...PROGRAMME, contacts: [{ label: "Line", url: "javascript:alert(1)", phone: "112" }], extra: "x" };
    const result = await lookupProgramme("ACMELOGI26", { fetchImpl: respond(200, { programme: dirty }) });
    expect(result.ok && result.programme.contacts).toEqual([{ label: "Line", phone: "112" }]);
  });
});


describe("the choice to be counted in an organisation's monthly total", () => {
  const OFFERS: Programme = { ...PROGRAMME, headcount: true };

  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: fakeStorage() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is off unless the person turns it on, however they join", () => {
    saveProgramme("u1", OFFERS);
    expect(loadMembership("u1")).toEqual({ programme: OFFERS, counted: false, figures: false, countedMonth: null });
    saveProgramme("u2", OFFERS, { counted: false });
    expect(loadMembership("u2")?.counted).toBe(false);
  });

  it("is only ever on for a programme that offers it", () => {
    saveProgramme("u1", PROGRAMME, { counted: true });
    expect(loadMembership("u1")?.counted).toBe(false);
    const stored = JSON.stringify({ programme: PROGRAMME, counted: true });
    expect(parseStoredMembership(stored)?.counted).toBe(false);
  });

  it("is kept when the programme's details are refreshed from the server, but not carried to a different programme", () => {
    saveProgramme("u1", OFFERS, { counted: true });
    markCountedMonth("u1", "2026-11");
    saveProgramme("u1", { ...OFFERS, name: "Acme Logistics Ltd" });
    expect(loadMembership("u1")).toMatchObject({ counted: true, countedMonth: "2026-11" });
    saveProgramme("u1", { ...OFFERS, code: "OTHERORG26" });
    expect(loadMembership("u1")).toMatchObject({ counted: false, countedMonth: null });
  });

  it("can be turned on and off, and turning it on starts afresh", () => {
    saveProgramme("u1", OFFERS);
    expect(setCounted("u1", true)).toBe(true);
    expect(loadMembership("u1")?.counted).toBe(true);
    markCountedMonth("u1", "2026-11");
    expect(loadMembership("u1")?.countedMonth).toBe("2026-11");
    expect(setCounted("u1", false)).toBe(true);
    expect(loadMembership("u1")).toEqual({ programme: OFFERS, counted: false, figures: false, countedMonth: null });
    setCounted("u1", true);
    expect(loadMembership("u1")?.countedMonth).toBeNull();
  });

  it("has nothing to turn on when there is no programme, or the browser refuses", () => {
    expect(setCounted("nobody", true)).toBe(false);
    saveProgramme("u1", OFFERS);
    vi.stubGlobal("window", { localStorage: fakeStorage({ refuseWrites: true }) });
    expect(setCounted("u1", true)).toBe(false);
    expect(markCountedMonth("u1", "2026-11")).toBe(false);
  });

  it("only remembers a month for someone who is counted", () => {
    saveProgramme("u1", OFFERS);
    expect(markCountedMonth("u1", "2026-11")).toBe(false);
    expect(loadMembership("u1")?.countedMonth).toBeNull();
  });

  it("does not trust a hand-edited stored value", () => {
    const edited = (extra: object) => JSON.stringify({ programme: OFFERS, ...extra });
    expect(parseStoredMembership(edited({ counted: "yes" }))?.counted).toBe(false);
    expect(parseStoredMembership(edited({ counted: true, countedMonth: "soon" }))?.countedMonth).toBeNull();
    expect(parseStoredMembership(edited({ counted: true, countedMonth: "2026-11" }))).toMatchObject({ counted: true, countedMonth: "2026-11" });
    expect(parseStoredMembership(edited({ counted: false, countedMonth: "2026-11" }))?.countedMonth).toBeNull();
  });

  it("is removed with the programme", () => {
    saveProgramme("u1", OFFERS, { counted: true });
    clearProgramme("u1");
    expect(loadMembership("u1")).toBeNull();
  });

  it("stores the choice on this device only, as plain flags beside the programme", () => {
    saveProgramme("u1", OFFERS, { counted: true });
    const raw = (window.localStorage as unknown as ReturnType<typeof fakeStorage>).data.get("recoverly:programme:u1") as string;
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(["counted", "programme"]);
  });

  describe("sharing anonymous progress figures", () => {
    const OFFERS_FIGURES: Programme = { ...PROGRAMME, headcount: true, figures: true };

    it("is off unless chosen, and needs both the count and a programme that offers it", () => {
      saveProgramme("u1", OFFERS_FIGURES, { counted: true });
      expect(loadMembership("u1")).toMatchObject({ counted: true, figures: false });
      saveProgramme("u2", OFFERS_FIGURES, { counted: false, figures: true });
      expect(loadMembership("u2")).toMatchObject({ counted: false, figures: false });
      saveProgramme("u3", { ...PROGRAMME, headcount: true }, { counted: true, figures: true });
      expect(loadMembership("u3")).toMatchObject({ counted: true, figures: false });
    });

    it("can be turned on and off while counted, and does not restart the monthly tick", () => {
      saveProgramme("u1", OFFERS_FIGURES, { counted: true });
      markCountedMonth("u1", "2026-11");
      expect(setFigures("u1", true)).toBe(true);
      expect(loadMembership("u1")).toMatchObject({ counted: true, figures: true, countedMonth: "2026-11" });
      expect(setFigures("u1", false)).toBe(true);
      expect(loadMembership("u1")?.figures).toBe(false);
    });

    it("goes when the count goes", () => {
      saveProgramme("u1", OFFERS_FIGURES, { counted: true, figures: true });
      expect(loadMembership("u1")?.figures).toBe(true);
      setCounted("u1", false);
      expect(loadMembership("u1")).toMatchObject({ counted: false, figures: false });
      setCounted("u1", true);
      expect(loadMembership("u1")?.figures).toBe(false);
    });

    it("has nothing to turn on without a count or a programme, and is kept when the programme's details refresh", () => {
      expect(setFigures("nobody", true)).toBe(false);
      saveProgramme("u1", OFFERS_FIGURES);
      expect(setFigures("u1", true)).toBe(false);
      saveProgramme("u2", OFFERS_FIGURES, { counted: true, figures: true });
      saveProgramme("u2", { ...OFFERS_FIGURES, name: "Acme Logistics Ltd" });
      expect(loadMembership("u2")?.figures).toBe(true);
      // The organisation stops offering figures: the choice goes.
      saveProgramme("u2", { ...OFFERS_FIGURES, figures: undefined });
      expect(loadMembership("u2")).toMatchObject({ counted: true, figures: false });
    });

    it("does not trust a hand-edited stored value", () => {
      const edited = (extra: object) => JSON.stringify({ programme: OFFERS_FIGURES, ...extra });
      expect(parseStoredMembership(edited({ counted: true, figures: "yes" }))?.figures).toBe(false);
      expect(parseStoredMembership(edited({ counted: false, figures: true }))?.figures).toBe(false);
      expect(parseStoredMembership(edited({ counted: true, figures: true }))?.figures).toBe(true);
    });
  });
});
