import { describe, expect, it } from "vitest";

import {
  PATTERN_KEYS,
  SHARE_EXPIRY_HOURS,
  SHARE_LIMITS,
  SHARE_PRESETS,
  SHARE_SECTIONS,
  type ShareFacts,
  buildShareLink,
  buildSnapshot,
  fromBase64Url,
  hasContent,
  isExpiryHours,
  isShareCiphertext,
  isShareId,
  isShareIv,
  parseShareId,
  parseShareKey,
  sanitiseSnapshot,
  toBase64Url
} from "@/lib/share";

const NOW = new Date("2026-11-12T09:30:00.000Z");

const FACTS: ShareFacts = {
  recordsSince: new Date(2026, 8, 3),
  totalLogged: 41,
  monthMl: 1200,
  previousMonthMl: 3000,
  dailyAverageMl: 100,
  currentStreakDays: 6,
  longestStreakDays: 11,
  freeDaysThisMonth: 9,
  daysThisMonth: 12,
  weeklyGoalMl: 500,
  audit: { score: 14, date: new Date(2026, 9, 20), assessments: 2 },
  cravings: { total: 7, passed: 5, avgIntensity: 3.4 },
  patterns: [
    { labelKey: "trigger.fridays", share: 0.31 },
    { labelKey: "trigger.mood", mood: "stressed", share: 0.22 }
  ],
  motivation: "My daughter",
  note: "Please ask about sleep.\nAnd the weekends.",
  plans: [{ when: "I feel stressed after work", then: "I walk and call my sister" }]
};

describe("buildSnapshot", () => {
  it("contains nothing that was not ticked", () => {
    const snapshot = buildSnapshot(FACTS, ["progress"], { now: NOW });
    expect(Object.keys(snapshot).sort()).toEqual(["createdAt", "progress", "v"]);
  });

  it("contains each ticked section", () => {
    const snapshot = buildSnapshot(FACTS, [...SHARE_SECTIONS], { now: NOW, label: "Ravi" });
    expect(snapshot.label).toBe("Ravi");
    expect(snapshot.progress?.currentStreakDays).toBe(6);
    expect(snapshot.progress?.since).toBe("2026-09-03");
    expect(snapshot.audit).toEqual({ score: 14, max: 40, date: "2026-10-20", assessments: 2 });
    expect(snapshot.cravings).toEqual({ total: 7, passed: 5, avgIntensity: 3.4 });
    expect(snapshot.patterns).toEqual([
      { key: "trigger.fridays", percent: 31 },
      { key: "trigger.mood", mood: "stressed", percent: 22 }
    ]);
    expect(snapshot.why).toBe("My daughter");
    expect(snapshot.note).toBe("Please ask about sleep.\nAnd the weekends.");
    expect(snapshot.plans).toEqual([{ when: "I feel stressed after work", then: "I walk and call my sister" }]);
  });

  it("never carries an email or an account name: they are not inputs, and the snapshot has no such field", () => {
    const snapshot = JSON.stringify(buildSnapshot(FACTS, [...SHARE_SECTIONS], { now: NOW }));
    expect(snapshot).not.toMatch(/email|@|uid|displayName/i);
  });

  it("leaves out a ticked section that has nothing in it", () => {
    const snapshot = buildSnapshot({ ...FACTS, audit: null, cravings: null, patterns: [], motivation: null, note: "  ", plans: [] }, [...SHARE_SECTIONS], { now: NOW });
    expect(Object.keys(snapshot).sort()).toEqual(["createdAt", "progress", "v"]);
  });

  it("marks when it was made", () => {
    expect(buildSnapshot(FACTS, ["progress"], { now: NOW }).createdAt).toBe("2026-11-12T09:30:00.000Z");
  });

  it("the presets never include the person's own words, notes or plans", () => {
    for (const sections of Object.values(SHARE_PRESETS)) {
      for (const own of ["why", "notes", "plans"] as const) expect(sections).not.toContain(own);
    }
  });
});

describe("sanitiseSnapshot", () => {
  const good = () => buildSnapshot(FACTS, [...SHARE_SECTIONS], { now: NOW, label: "Ravi" });

  it("leaves a well-formed summary exactly as it was", () => {
    expect(sanitiseSnapshot(JSON.parse(JSON.stringify(good())))).toEqual(good());
  });

  it("refuses anything that is not a version-1 summary with a time", () => {
    for (const bad of [null, undefined, "x", 5, [], {}, { v: 2, createdAt: NOW.toISOString() }, { v: 1 }, { v: 1, createdAt: "not a date" }, { v: 1, createdAt: 12345 }]) {
      expect(sanitiseSnapshot(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("drops fields it does not know, so a stranger's link cannot add to the page", () => {
    const out = sanitiseSnapshot({ ...good(), email: "a@b.c", html: "<script>alert(1)</script>", progress: { ...good().progress, extra: 1 } }) as Record<string, unknown>;
    expect(out.email).toBeUndefined();
    expect(out.html).toBeUndefined();
    expect((out.progress as Record<string, unknown>).extra).toBeUndefined();
  });

  it("clamps numbers to what they can honestly be", () => {
    const out = sanitiseSnapshot({
      v: 1,
      createdAt: NOW.toISOString(),
      progress: { checkIns: -5, monthMl: Infinity, previousMonthMl: NaN, dailyAverageMl: "9", currentStreakDays: 1e12, longestStreakDays: 2.6, freeDaysThisMonth: 99, daysThisMonth: 99, since: "2026-02-31" },
      cravings: { total: 3, passed: 99, avgIntensity: 17 },
      audit: { score: 400, date: "2026-10-20", assessments: 0 }
    });
    expect(out?.progress).toMatchObject({ checkIns: 0, monthMl: 0, previousMonthMl: 0, dailyAverageMl: 0, currentStreakDays: 100_000, longestStreakDays: 3, freeDaysThisMonth: 31, daysThisMonth: 31, since: null, weeklyGoalMl: null });
    expect(out?.cravings).toEqual({ total: 3, passed: 3, avgIntensity: 5 });
    expect(out?.audit).toEqual({ score: 40, max: 40, date: "2026-10-20", assessments: 1 });
  });

  it("only accepts the app's own pattern labels, and a mood only with its words", () => {
    const out = sanitiseSnapshot({
      v: 1,
      createdAt: NOW.toISOString(),
      patterns: [
        { key: "trigger.fridays", percent: 30 },
        { key: "<script>", percent: 10 },
        { key: "trigger.mood", percent: 20 },
        { key: "trigger.mood", mood: "  tired  ", percent: 120 }
      ]
    });
    expect(out?.patterns).toEqual([
      { key: "trigger.fridays", percent: 30 },
      { key: "trigger.mood", mood: "tired", percent: 100 }
    ]);
    for (const key of PATTERN_KEYS) expect(key).toMatch(/^trigger\./);
  });

  it("cuts text to its limits and flattens line breaks where it is one line", () => {
    const out = sanitiseSnapshot({
      v: 1,
      createdAt: NOW.toISOString(),
      label: `  Ravi\nKumar ${"x".repeat(100)}`,
      why: "w".repeat(500),
      note: `${"n".repeat(2000)}`,
      plans: [{ when: "a".repeat(500), then: "b".repeat(500) }, { when: "", then: "no situation" }, { when: "x", then: "y" }, { when: "p", then: "q" }, { when: "r", then: "s" }]
    });
    expect(out?.label?.length).toBe(SHARE_LIMITS.labelMax);
    expect(out?.label).not.toMatch(/\n/);
    expect(out?.why?.length).toBe(SHARE_LIMITS.whyMax);
    expect(out?.note?.length).toBe(SHARE_LIMITS.noteMax);
    expect(out?.plans).toHaveLength(SHARE_LIMITS.plansMax);
    expect(out?.plans?.[0].when.length).toBe(SHARE_LIMITS.planTextMax);
  });

  it("keeps the line breaks in a note but not other control characters", () => {
    expect(sanitiseSnapshot({ v: 1, createdAt: NOW.toISOString(), note: "one\r\ntwo\u0007\n\n\n\nthree" })?.note).toBe("one\ntwo \n\nthree");
  });

  it("leaves markup as plain text for the page to escape, rather than trying to strip it", () => {
    expect(sanitiseSnapshot({ v: 1, createdAt: NOW.toISOString(), note: "<img src=x onerror=alert(1)>" })?.note).toBe("<img src=x onerror=alert(1)>");
  });

  it("does not throw on hostile input", () => {
    const hostile = { v: 1, createdAt: NOW.toISOString(), progress: "x", audit: [], cravings: 7, patterns: "no", plans: [null, 4, [], { when: {}, then: [] }], label: {}, why: 3, note: [] };
    expect(() => sanitiseSnapshot(hostile)).not.toThrow();
    expect(hasContent(sanitiseSnapshot(hostile) as never)).toBe(false);
  });
});

describe("hasContent", () => {
  it("is false for a summary with nothing ticked", () => {
    expect(hasContent(buildSnapshot(FACTS, [], { now: NOW }))).toBe(false);
    expect(hasContent(buildSnapshot(FACTS, ["progress"], { now: NOW }))).toBe(true);
  });
});

describe("base64url", () => {
  it("round-trips every byte value and lengths around the padding boundaries", () => {
    for (const length of [0, 1, 2, 3, 4, 5, 11, 12, 16, 32, 255, 20_000]) {
      const bytes = new Uint8Array(length).map((_, i) => (i * 37 + length) % 256);
      const text = toBase64Url(bytes);
      expect(text).toMatch(/^[A-Za-z0-9_-]*$/);
      expect(Array.from(fromBase64Url(text) ?? [])).toEqual(Array.from(bytes));
    }
  });

  it("refuses text that is not base64url", () => {
    for (const bad of ["a+b", "a/b", "a=b", "a b", "é", "abcde"]) expect(fromBase64Url(bad), bad).toBeNull();
  });
});

describe("addresses, keys and links", () => {
  const id = "A".repeat(22);
  const key = "B".repeat(43);

  it("builds the link with the key after the #, where no server sees it", () => {
    const link = buildShareLink("https://recoverly.co.in/", id, key);
    expect(link).toBe(`https://recoverly.co.in/share/${id}#${key}`);
    expect(new URL(link).hash).toBe(`#${key}`);
    expect(new URL(link).pathname).toBe(`/share/${id}`);
  });

  it("reads a key even when a chat app has stuck punctuation on the end", () => {
    expect(parseShareKey(`#${key}`)).toBe(key);
    expect(parseShareKey(`#${key}.`)).toBe(key);
    expect(parseShareKey(`#${key})`)).toBe(key);
  });

  it("does not read a key that is short, missing or not a key", () => {
    for (const bad of ["", "#", "#abc", `#${"B".repeat(42)}`, `#${"B".repeat(42)}!`, null, undefined]) expect(parseShareKey(bad as never), String(bad)).toBeNull();
  });

  it("reads an address only when it is exactly right", () => {
    expect(parseShareId(id)).toBe(id);
    expect(parseShareId(encodeURIComponent(id))).toBe(id);
    for (const bad of ["", "short", `${id}x`, `${id.slice(1)}!`, "%E0%A4%A", "../../etc/passwd", null, undefined]) expect(parseShareId(bad as never), String(bad)).toBeNull();
    expect(isShareId(id)).toBe(true);
    expect(isShareId(1)).toBe(false);
  });

  it("checks the nonce, the ciphertext and the lifetime a request names", () => {
    expect(isShareIv("A".repeat(16))).toBe(true);
    expect(isShareIv("A".repeat(15))).toBe(false);
    expect(isShareCiphertext("A".repeat(22))).toBe(true);
    expect(isShareCiphertext("A".repeat(21))).toBe(false);
    expect(isShareCiphertext("A".repeat(SHARE_LIMITS.ciphertextMaxChars))).toBe(true);
    expect(isShareCiphertext("A".repeat(SHARE_LIMITS.ciphertextMaxChars + 1))).toBe(false);
    expect(isShareCiphertext("not base64!")).toBe(false);
    for (const hours of SHARE_EXPIRY_HOURS) expect(isExpiryHours(hours)).toBe(true);
    for (const bad of [0, 1, 25, 169, 8760, "168", null]) expect(isExpiryHours(bad), String(bad)).toBe(false);
  });

  it("offers exactly 1, 7 and 30 days", () => {
    expect(SHARE_EXPIRY_HOURS.map((h) => h / 24)).toEqual([1, 7, 30]);
  });
});
