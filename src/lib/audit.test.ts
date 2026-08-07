import { en } from "@/lib/i18n/en";
import { describe, expect, it } from "vitest";

import {
  AUDIT_MAX_SCORE,
  AUDIT_QUESTIONS,
  interpretAudit,
  isAuditComplete,
  scoreAudit
} from "@/lib/audit";

const answerAll = (optionIndex: number) =>
  Object.fromEntries(AUDIT_QUESTIONS.map((q) => [q.id, Math.min(optionIndex, q.options.length - 1)]));

describe("AUDIT instrument integrity", () => {
  it("has exactly 10 questions", () => {
    expect(AUDIT_QUESTIONS).toHaveLength(10);
  });

  it("items 1-8 have 5 options scored 0-4", () => {
    for (const q of AUDIT_QUESTIONS.slice(0, 8)) {
      expect(q.options).toHaveLength(5);
      expect(q.points).toEqual([0, 1, 2, 3, 4]);
    }
  });

  it("items 9 and 10 have 3 options scored 0, 2, 4", () => {
    for (const q of AUDIT_QUESTIONS.slice(8)) {
      expect(q.options).toHaveLength(3);
      expect(q.points).toEqual([0, 2, 4]);
    }
  });

  it("every option has a matching point value", () => {
    for (const q of AUDIT_QUESTIONS) {
      expect(q.points).toHaveLength(q.options.length);
    }
  });

  it("maximum possible score is 40", () => {
    expect(scoreAudit(answerAll(4))).toBe(AUDIT_MAX_SCORE);
  });
});

describe("scoreAudit", () => {
  it("scores all-first-options as 0", () => {
    expect(scoreAudit(answerAll(0))).toBe(0);
  });

  it("treats unanswered questions as 0 (partial results under-estimate)", () => {
    expect(scoreAudit({ 1: 4 })).toBe(4);
    expect(scoreAudit({})).toBe(0);
  });

  it("ignores an out-of-range option index rather than throwing", () => {
    expect(scoreAudit({ 1: 99 })).toBe(0);
  });

  it("applies the 0/2/4 scale to items 9 and 10", () => {
    expect(scoreAudit({ 9: 1, 10: 2 })).toBe(2 + 4);
  });
});

describe("isAuditComplete", () => {
  it("is false until every question is answered", () => {
    expect(isAuditComplete({ 1: 0 })).toBe(false);
    expect(isAuditComplete(answerAll(0))).toBe(true);
  });
});

describe("interpretAudit — WHO risk zones", () => {
  it.each([
    [0, "low"],
    [7, "low"],
    [8, "hazardous"],
    [15, "hazardous"],
    [16, "harmful"],
    [19, "harmful"],
    [20, "possible-dependence"],
    [40, "possible-dependence"]
  ])("score %i falls in the %s zone", (score, zone) => {
    expect(interpretAudit(score).zone).toBe(zone);
  });

  it("shows the sudden-cessation warning at 8 and above (project safety rule)", () => {
    expect(interpretAudit(7).showWithdrawalWarning).toBe(false);
    expect(interpretAudit(8).showWithdrawalWarning).toBe(true);
    expect(interpretAudit(40).showWithdrawalWarning).toBe(true);
  });

  it("points every at-risk band toward a professional", () => {
    for (const s of [8, 16, 20, 40]) {
      expect(en[interpretAudit(s).guidanceKey]).toMatch(/doctor|professional|de-addiction/i);
    }
  });

  it("never uses shaming language", () => {
    for (let s = 0; s <= 40; s++) {
      const r = interpretAudit(s);
      // The wording lives in the dictionary now; assert on what a reader sees.
      const text = `${en[r.labelKey]} ${en[r.meaningKey]} ${en[r.guidanceKey]}`;
      expect(text).not.toMatch(/alcoholic|abuse[rd]|failure|bad|shame|fault|weak/i);
    }
  });

  it("never claims to diagnose", () => {
    for (let s = 0; s <= 40; s++) {
      const r = interpretAudit(s);
      expect(`${en[r.meaningKey]} ${en[r.guidanceKey]}`).not.toMatch(/you have (an )?(alcohol use disorder|addiction)/i);
    }
  });
});
