import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadPlans } from "@/lib/plans";
import { sanitiseProgramme, validateProgramme } from "@/lib/programme";
import { addProgrammePlans, plansToAdd } from "@/lib/programme-plans";

const base = { code: "CLINICA26", name: "Clinic A", kind: "clinic", welcome: { en: "Welcome to the clinic." }, contacts: [] };
const P1 = { when: "I feel low after work", then: "I call my sister" };
const P2 = { when: "Friends offer a drink", then: "I order a lime soda" };
const P3 = { when: "It is payday", then: "I go straight home" };
let n = 0;
const id = () => `id${++n}`;

function fakeStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}
beforeEach(() => vi.stubGlobal("window", { localStorage: fakeStorage() }));
afterEach(() => vi.unstubAllGlobals());

describe("a programme's plans", () => {
  it("are cleaned: at most three, both parts needed, one line, cut to length", () => {
    const p = sanitiseProgramme({ ...base, plans: [P1, { when: "only a when" }, { when: "  a\n b ", then: "x".repeat(300) }, P2, P3, { when: "fifth", then: "one" }] });
    expect(p?.plans).toHaveLength(3);
    expect(p?.plans?.[1].when).toBe("a b");
    expect(p?.plans?.[1].then).toHaveLength(120);
    expect(sanitiseProgramme({ ...base, plans: "nope" })?.plans).toBeUndefined();
    expect(sanitiseProgramme({ ...base })?.plans).toBeUndefined();
  });

  it("are checked when a register entry is written", () => {
    expect(validateProgramme({ ...base, plans: [P1, P2] } as never)).toEqual([]);
    expect(validateProgramme({ ...base, plans: [P1, P2, P3, P1] } as never).join()).toMatch(/at most 3/);
    expect(validateProgramme({ ...base, plans: [{ when: "x", then: "" }] } as never).join()).toMatch(/needs a "when" and a "then"/);
  });
});

describe("adding them to the person's own plans", () => {
  it("adds only ones they do not have, up to the limit, and gives each its own id", () => {
    const own = [{ id: "a", when: "i feel low after work", then: "I CALL MY SISTER" }];
    const extra = plansToAdd(own, { plans: [P1, P2, P3] }, id);
    expect(extra.map((p) => p.when)).toEqual([P2.when, P3.when]);
    expect(new Set(extra.map((p) => p.id)).size).toBe(2);
    expect(plansToAdd([{ id: "1", ...P1 }, { id: "2", ...P2 }, { id: "3", ...P3 }], { plans: [P1] }, id)).toEqual([]);
    expect(plansToAdd([], { plans: undefined }, id)).toEqual([]);
  });

  it("saves to this device's storage and is idempotent", () => {
    expect(addProgrammePlans("u1", { plans: [P1, P2] }, id)).toEqual({ ok: true, added: 2 });
    expect(loadPlans("u1").map((p) => p.then)).toEqual([P1.then, P2.then]);
    expect(addProgrammePlans("u1", { plans: [P1, P2] }, id)).toEqual({ ok: true, added: 0 });
    expect(loadPlans("u2")).toEqual([]);
  });

  it("says so when the browser refuses to store", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => undefined } });
    expect(addProgrammePlans("u1", { plans: [P1] }, id)).toEqual({ ok: false, added: 0 });
  });
});
