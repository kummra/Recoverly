import { describe, expect, it } from "vitest";

import { MAX_PLANS, MAX_PLAN_TEXT, addPlan, clearPlans, loadPlans, normalisePlanInput, parsePlans, planStorageKey, removePlan, savePlans, updatePlans } from "@/lib/plans";

const plan = (n: number) => ({ id: `p${n}`, when: `when ${n}`, then: `then ${n}` });

describe("plans", () => {
  it("is keyed per user, so two people sharing a phone do not share plans", () => {
    expect(planStorageKey("a")).not.toBe(planStorageKey("b"));
  });

  it("reads nothing as an empty list and never throws on bad storage", () => {
    expect(parsePlans(null)).toEqual([]);
    expect(parsePlans("")).toEqual([]);
    expect(parsePlans("{not json")).toEqual([]);
    expect(parsePlans('{"id":"x"}')).toEqual([]); // an object, not a list
    expect(parsePlans("42")).toEqual([]);
  });

  it("keeps well-formed plans and drops everything else", () => {
    const raw = JSON.stringify([
      plan(1),
      { id: "no-then", when: "w" },
      { id: "", when: "w", then: "t" },
      { id: "blank", when: "   ", then: "t" },
      { id: "num", when: 5, then: "t" },
      null,
      "text",
      plan(1), // duplicate id
      plan(2)
    ]);
    expect(parsePlans(raw)).toEqual([plan(1), plan(2)]);
  });

  it("caps the count and the length of what it reads back", () => {
    const many = JSON.stringify([1, 2, 3, 4, 5].map(plan));
    expect(parsePlans(many)).toHaveLength(MAX_PLANS);
    const long = JSON.stringify([{ id: "x", when: "w".repeat(500), then: "t" }]);
    expect(parsePlans(long)[0].when).toHaveLength(MAX_PLAN_TEXT);
  });

  it("tidies whitespace and refuses a half-written plan", () => {
    expect(normalisePlanInput({ when: "  I feel \n  tense ", then: " walk " })).toEqual({ when: "I feel tense", then: "walk" });
    expect(normalisePlanInput({ when: "x", then: "  " })).toBeNull();
    expect(normalisePlanInput({ when: "", then: "x" })).toBeNull();
  });

  it("adds up to the limit and no further", () => {
    let plans = [] as ReturnType<typeof parsePlans>;
    for (let i = 1; i <= MAX_PLANS; i++) {
      const next = addPlan(plans, { when: `w${i}`, then: `t${i}` }, `id${i}`);
      expect(next).not.toBeNull();
      plans = next!;
    }
    expect(addPlan(plans, { when: "one", then: "more" }, "extra")).toBeNull();
    expect(addPlan([], { when: "", then: "" }, "id")).toBeNull();
  });

  it("removes by id and leaves the rest untouched", () => {
    expect(removePlan([plan(1), plan(2), plan(3)], "p2")).toEqual([plan(1), plan(3)]);
    expect(removePlan([plan(1)], "missing")).toEqual([plan(1)]);
  });

  it("does not let user text become markup or a prototype key", () => {
    // Plans are rendered as React text, never as HTML; this just pins that the
    // stored shape is plain strings and nothing is evaluated on the way in.
    const [p] = parsePlans(JSON.stringify([{ id: "x", when: "<img src=x onerror=alert(1)>", then: "__proto__" }]));
    expect(p).toEqual({ id: "x", when: "<img src=x onerror=alert(1)>", then: "__proto__" });
    expect(Object.keys(p).sort()).toEqual(["id", "then", "when"]);
  });
});

describe("plans in storage", () => {
  function fakeStorage(initial: Record<string, string> = {}, failWrites = false) {
    const data = { ...initial };
    const storage = {
      getItem: (k: string) => (k in data ? data[k] : null),
      setItem: (k: string, v: string) => {
        if (failWrites) throw new Error("QuotaExceededError");
        data[k] = v;
      },
      removeItem: (k: string) => void delete data[k]
    };
    return { data, storage };
  }
  const withWindow = (storage: unknown, run: () => void) => {
    const g = globalThis as unknown as { window?: unknown };
    const before = g.window;
    g.window = { localStorage: storage };
    try { run(); } finally { g.window = before; }
  };

  it("saves, reloads and clears, per user", () => {
    const { data, storage } = fakeStorage();
    withWindow(storage, () => {
      expect(savePlans("a", [plan(1)])).toBe(true);
      expect(savePlans("b", [plan(2)])).toBe(true);
      expect(loadPlans("a")).toEqual([plan(1)]);
      clearPlans("a");
      expect(loadPlans("a")).toEqual([]);
      expect(loadPlans("b")).toEqual([plan(2)]); // someone else's plans are untouched
    });
    expect(Object.keys(data)).toEqual([planStorageKey("b")]);
  });

  it("reports a refused write instead of pretending it worked", () => {
    const { storage } = fakeStorage({}, true);
    withWindow(storage, () => expect(savePlans("a", [plan(1)])).toBe(false));
  });

  it("survives storage that is blocked outright", () => {
    const blocked = {
      getItem: () => { throw new Error("SecurityError"); },
      setItem: () => { throw new Error("SecurityError"); },
      removeItem: () => { throw new Error("SecurityError"); }
    };
    withWindow(blocked, () => {
      expect(loadPlans("a")).toEqual([]);
      expect(savePlans("a", [plan(1)])).toBe(false);
      expect(() => clearPlans("a")).not.toThrow();
    });
  });
});

describe("updatePlans", () => {
  function store(initial?: unknown, failWrites = false) {
    const data: Record<string, string> = initial ? { [planStorageKey("a")]: JSON.stringify(initial) } : {};
    return {
      data,
      storage: {
        getItem: (k: string) => (k in data ? data[k] : null),
        setItem: (k: string, v: string) => { if (failWrites) throw new Error("full"); data[k] = v; },
        removeItem: (k: string) => void delete data[k]
      }
    };
  }
  const run = (storage: unknown, fn: () => void) => {
    const g = globalThis as unknown as { window?: unknown };
    const before = g.window;
    g.window = { localStorage: storage };
    try { fn(); } finally { g.window = before; }
  };

  it("applies the change to what is stored now, not to an older copy", () => {
    // Tab A loaded [1]; tab B has since saved [1, 2]. Tab A removing plan 1 must
    // leave plan 2 in place rather than writing back its own stale list.
    const { storage, data } = store([plan(1), plan(2)]);
    run(storage, () => {
      const result = updatePlans("a", (current) => removePlan(current, "p1"));
      expect(result).toEqual({ ok: true, plans: [plan(2)] });
    });
    expect(JSON.parse(data[planStorageKey("a")])).toEqual([plan(2)]);
  });

  it("makes no write when the change is declined", () => {
    const { storage, data } = store([plan(1)]);
    run(storage, () => {
      expect(updatePlans("a", () => null)).toEqual({ ok: true, plans: [plan(1)] });
    });
    expect(JSON.parse(data[planStorageKey("a")])).toEqual([plan(1)]);
  });

  it("reports a refused write and returns what is really stored", () => {
    const { storage } = store([plan(1)], true);
    run(storage, () => {
      expect(updatePlans("a", (c) => [...c, plan(2)])).toEqual({ ok: false, plans: [plan(1)] });
    });
  });
});
