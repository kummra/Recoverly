import { describe, expect, it } from "vitest";

import { FEEDBACK_INTERESTS, MAX_FEEDBACK_MESSAGE, feedbackToDocument, parseFeedback } from "@/lib/feedback";

describe("parseFeedback", () => {
  it("accepts a choice on its own, a message on its own, or both", () => {
    expect(parseFeedback({ interests: ["counsellor"] }).ok).toBe(true);
    expect(parseFeedback({ interests: [], message: "A group in Tamil" }).ok).toBe(true);
    expect(parseFeedback({ interests: ["group", "family"], message: "Thanks" }).ok).toBe(true);
  });

  it("refuses an answer that says nothing", () => {
    expect(parseFeedback({ interests: [] }).ok).toBe(false);
    expect(parseFeedback({ interests: [], message: "   " }).ok).toBe(false);
    expect(parseFeedback({ interests: [], message: "" }).ok).toBe(false);
    expect(parseFeedback({}).ok).toBe(false);
  });

  it("refuses choices that are not on the list, so nothing else can be stored", () => {
    expect(parseFeedback({ interests: ["counsellor", "free-money"] }).ok).toBe(false);
    expect(parseFeedback({ interests: "counsellor" }).ok).toBe(false);
  });

  it("refuses a message over the limit and accepts one at it", () => {
    expect(parseFeedback({ interests: [], message: "x".repeat(MAX_FEEDBACK_MESSAGE) }).ok).toBe(true);
    expect(parseFeedback({ interests: [], message: "x".repeat(MAX_FEEDBACK_MESSAGE + 1) }).ok).toBe(false);
  });

  it("counts each choice once", () => {
    const parsed = parseFeedback({ interests: ["group", "group", "family"] });
    expect(parsed.ok && parsed.data.interests).toEqual(["group", "family"]);
  });

  it("refuses things that are not objects", () => {
    for (const input of [null, undefined, "hello", 42, []]) expect(parseFeedback(input).ok).toBe(false);
  });

  it("offers exactly the four services in the plan", () => {
    expect([...FEEDBACK_INTERESTS]).toEqual(["counsellor", "group", "family", "courses"]);
  });
});

describe("feedbackToDocument", () => {
  const now = new Date("2026-11-12T10:00:00Z");

  it("stores the choices, the message and the time, and nothing else", () => {
    const parsed = parseFeedback({ interests: ["counsellor"], message: "In Hindi please" });
    if (!parsed.ok) throw new Error("fixture must be valid");
    const doc = feedbackToDocument(parsed.data, now);
    expect(doc).toEqual({ interests: ["counsellor"], message: "In Hindi please", createdAt: now });
  });

  it("writes null, not undefined, for no message (Firestore rejects undefined)", () => {
    const parsed = parseFeedback({ interests: ["group"] });
    if (!parsed.ok) throw new Error("fixture must be valid");
    expect(feedbackToDocument(parsed.data, now).message).toBeNull();
  });
});
