import { describe, expect, it } from "vitest";

import { CONTEXT_TOKEN_BUDGET, type ChatTurn, estimateTokens, trimToTokenBudget } from "@/lib/ai-context";

const user = (content: string): ChatTurn => ({ role: "user", content });
const bot = (content: string): ChatTurn => ({ role: "assistant", content });

describe("estimateTokens", () => {
  it("counts a non-Latin script as heavier than the same length of English", () => {
    const english = "a".repeat(200);
    const hindi = "क".repeat(200);
    expect(estimateTokens(hindi)).toBeGreaterThan(estimateTokens(english) * 2);
  });

  it("leans high for Punjabi, the heaviest language measured (0.81 tokens a character)", () => {
    const measured = 0.81 * 281;
    expect(estimateTokens("ਕ".repeat(281))).toBeGreaterThanOrEqual(measured);
  });

  it("charges something for an empty message", () => {
    expect(estimateTokens("")).toBeGreaterThan(0);
  });
});

describe("trimToTokenBudget", () => {
  it("returns everything when it fits", () => {
    const chat = [user("hello"), bot("hi, how are you?"), user("not great")];
    expect(trimToTokenBudget(chat)).toEqual(chat);
  });

  it("returns nothing for nothing", () => {
    expect(trimToTokenBudget([])).toEqual([]);
  });

  it("drops the oldest messages first and keeps the newest", () => {
    const chat = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? user(`question ${i} ${"x".repeat(300)}`) : bot(`answer ${i} ${"y".repeat(900)}`)));
    const kept = trimToTokenBudget(chat, 1000);
    expect(kept.length).toBeLessThan(chat.length);
    expect(kept[kept.length - 1]).toBe(chat[chat.length - 1]);
    // What is kept is the tail of the conversation, in order.
    const tail = chat.slice(chat.length - kept.length);
    expect(kept).toEqual(tail);
  });

  it("keeps what was just said even when that alone is over budget", () => {
    const huge = user("z".repeat(10_000));
    expect(trimToTokenBudget([bot("earlier"), huge], 100)).toEqual([huge]);
  });

  it("never opens on a reply to a message that has been cut", () => {
    const chat = [user("a".repeat(2000)), bot("b".repeat(200)), user("c".repeat(200))];
    const kept = trimToTokenBudget(chat, 220);
    expect(kept[0].role).toBe("user");
  });

  it("holds a long chat in Punjabi under the budget a request can carry", () => {
    const chat = Array.from({ length: 50 }, (_, i) => (i % 2 === 0 ? user("ਕ".repeat(150)) : bot("ਖ".repeat(900))));
    const kept = trimToTokenBudget(chat);
    const total = kept.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    // The newest message may exceed the budget by itself; everything else fits.
    expect(total).toBeLessThanOrEqual(CONTEXT_TOKEN_BUDGET + estimateTokens(kept[kept.length - 1].content));
    expect(kept.length).toBeLessThan(10);
  });
});
