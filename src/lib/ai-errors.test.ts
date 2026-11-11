import { describe, expect, it } from "vitest";

import { AI_FAILURE_STATUS, classifyAiFailure, describeAiError, failureFromResponse } from "@/lib/ai-errors";

describe("classifyAiFailure", () => {
  it("calls a refused-for-rate request busy", () => {
    expect(classifyAiFailure({ status: 429 })).toBe("busy");
  });

  it("calls everything else unavailable, including a withdrawn model", () => {
    expect(classifyAiFailure({ status: 404 })).toBe("unavailable");
    expect(classifyAiFailure({ status: 500 })).toBe("unavailable");
    expect(classifyAiFailure(new Error("network down"))).toBe("unavailable");
    expect(classifyAiFailure(undefined)).toBe("unavailable");
    expect(classifyAiFailure(null)).toBe("unavailable");
  });

  it("maps each kind to a status a client can react to", () => {
    expect(AI_FAILURE_STATUS.busy).toBe(429);
    expect(AI_FAILURE_STATUS.unavailable).toBe(503);
  });
});

describe("failureFromResponse", () => {
  it("trusts the code the server sent", () => {
    expect(failureFromResponse(503, { code: "busy" })).toBe("busy");
    expect(failureFromResponse(500, { code: "unavailable" })).toBe("unavailable");
  });

  it("falls back to the status when there is no code (our own rate limit sends none)", () => {
    expect(failureFromResponse(429, { error: "Too many requests." })).toBe("busy");
    expect(failureFromResponse(502, null)).toBe("unavailable");
  });

  it("does not invent a diagnosis for a request that was simply wrong", () => {
    expect(failureFromResponse(400, { error: "Invalid request payload." })).toBe("generic");
    expect(failureFromResponse(401, { error: "Unauthorized" })).toBe("generic");
  });
});

describe("describeAiError", () => {
  it("gives the status, the provider's code and a short message on one line", () => {
    const line = describeAiError({
      status: 404,
      message: "404 model not found",
      error: { error: { code: "model_not_found" } }
    });
    expect(line).toBe("status=404 code=model_not_found message=404 model not found");
    expect(line).not.toContain("\n");
  });

  it("copes with things that are not errors", () => {
    expect(describeAiError(undefined)).toContain("no-status");
    expect(describeAiError("boom")).toContain("boom");
  });

  it("cuts a very long message", () => {
    expect(describeAiError({ message: "x".repeat(5000) }).length).toBeLessThan(400);
  });
});
