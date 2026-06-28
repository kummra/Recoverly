import { describe, expect, it } from "vitest";

import {
  deviceRegisterSchema,
  drinkRecordSchema,
  goalSchema,
  sobrietySignalSchema
} from "@/lib/schemas";

describe("drinkRecordSchema", () => {
  it("accepts a valid record", () => {
    expect(drinkRecordSchema.safeParse({ quantity: 330, type: "beer" }).success).toBe(true);
  });

  it("rejects out-of-range quantities and bad types", () => {
    expect(drinkRecordSchema.safeParse({ quantity: 0, type: "beer" }).success).toBe(false);
    expect(drinkRecordSchema.safeParse({ quantity: 5001, type: "beer" }).success).toBe(false);
    expect(drinkRecordSchema.safeParse({ quantity: 100, type: "moonshine" }).success).toBe(false);
  });

  it("rejects an over-long mood note", () => {
    expect(drinkRecordSchema.safeParse({ quantity: 100, type: "wine", mood: "x".repeat(121) }).success).toBe(false);
  });
});

describe("goalSchema", () => {
  it("accepts a valid weekly goal", () => {
    expect(goalSchema.safeParse({ goalWeeklyMl: 1000 }).success).toBe(true);
  });
  it("rejects negative or excessive goals", () => {
    expect(goalSchema.safeParse({ goalWeeklyMl: -1 }).success).toBe(false);
    expect(goalSchema.safeParse({ goalWeeklyMl: 99999 }).success).toBe(false);
  });
  it("validates the reminderTime format", () => {
    expect(goalSchema.safeParse({ goalWeeklyMl: 0, reminderTime: "09:30" }).success).toBe(true);
    expect(goalSchema.safeParse({ goalWeeklyMl: 0, reminderTime: "25:00" }).success).toBe(false);
  });
  it("accepts an optional motivation but caps its length", () => {
    expect(goalSchema.safeParse({ goalWeeklyMl: 0, motivation: "For my family" }).success).toBe(true);
    expect(goalSchema.safeParse({ goalWeeklyMl: 0, motivation: "x".repeat(201) }).success).toBe(false);
  });
});

describe("sobrietySignalSchema — honesty guard", () => {
  it("accepts a SEN0376 presence signal (no BAC)", () => {
    expect(
      sobrietySignalSchema.safeParse({ source: "guardian_ambient", result: "detected", ppm: 3.2 }).success
    ).toBe(true);
  });

  it("REJECTS a SEN0376 presence signal carrying a BAC", () => {
    expect(
      sobrietySignalSchema.safeParse({ source: "guardian_ambient", result: "detected", bac: 0.05 }).success
    ).toBe(false);
    expect(
      sobrietySignalSchema.safeParse({ source: "guardian_breath", result: "detected", brac: 0.4 }).success
    ).toBe(false);
  });

  it("allows a BAC from the MQ-3 path and from manual entries", () => {
    expect(
      sobrietySignalSchema.safeParse({ source: "breathalyser_mq3", result: "detected", bac: 0.06, brac: 0.28 }).success
    ).toBe(true);
    expect(
      sobrietySignalSchema.safeParse({ source: "manual", result: "detected", bac: 0.08, deviceName: "Jupiter X1" }).success
    ).toBe(true);
  });

  it("rejects unknown sources and out-of-range BAC", () => {
    expect(sobrietySignalSchema.safeParse({ source: "ouija", result: "clear" }).success).toBe(false);
    expect(sobrietySignalSchema.safeParse({ source: "manual", result: "detected", bac: 2 }).success).toBe(false);
  });
});

describe("deviceRegisterSchema", () => {
  it("defaults the device kind", () => {
    const parsed = deviceRegisterSchema.safeParse({ label: "My Guardian" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.kind).toBe("sobriety_guardian");
  });
  it("accepts the NGO device kinds", () => {
    expect(deviceRegisterSchema.safeParse({ label: "Ward 3", kind: "campus_detector" }).success).toBe(true);
    expect(deviceRegisterSchema.safeParse({ label: "Loaner", kind: "breathalyser" }).success).toBe(true);
  });
  it("rejects an empty label or unknown kind", () => {
    expect(deviceRegisterSchema.safeParse({ label: "" }).success).toBe(false);
    expect(deviceRegisterSchema.safeParse({ label: "x", kind: "toaster" }).success).toBe(false);
  });
});
