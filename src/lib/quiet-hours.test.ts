import { describe, expect, it } from "vitest";

import { shouldShowReminder } from "@/lib/analytics";
import { QUIET_HOURS_KEY, cleanQuietHours, isQuiet, outsideQuiet, readQuietHours, writeQuietHours } from "@/lib/quiet-hours";

const at = (h: number, m = 0) => new Date(2026, 10, 19, h, m, 0, 0);
const night = { start: "22:00", end: "07:00" };
const day = { start: "08:00", end: "15:00" };

describe("what counts as a window", () => {
  it("is two valid, different times, and nothing else", () => {
    expect(cleanQuietHours(night)).toEqual(night);
    expect(cleanQuietHours({ start: "22:00", end: "22:00" })).toBeNull();
    for (const bad of [null, undefined, "22:00", 5, [], {}, { start: "22:00" }, { start: "25:00", end: "07:00" }, { start: "22:00", end: "7am" }, { start: 2200, end: 700 }]) {
      expect(cleanQuietHours(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("whether it is quiet now", () => {
  it("handles a window across midnight, the end being outside it", () => {
    expect(isQuiet(night, at(22, 0))).toBe(true);
    expect(isQuiet(night, at(23, 59))).toBe(true);
    expect(isQuiet(night, at(0, 0))).toBe(true);
    expect(isQuiet(night, at(6, 59))).toBe(true);
    expect(isQuiet(night, at(7, 0))).toBe(false);
    expect(isQuiet(night, at(12, 0))).toBe(false);
    expect(isQuiet(night, at(21, 59))).toBe(false);
  });

  it("handles a window inside one day, such as a night-shift worker's sleep", () => {
    expect(isQuiet(day, at(7, 59))).toBe(false);
    expect(isQuiet(day, at(8, 0))).toBe(true);
    expect(isQuiet(day, at(14, 59))).toBe(true);
    expect(isQuiet(day, at(15, 0))).toBe(false);
  });

  it("is never quiet with no window or a bad one", () => {
    expect(isQuiet(null, at(3, 0))).toBe(false);
    expect(isQuiet(undefined, at(3, 0))).toBe(false);
    expect(isQuiet({ start: "09:00", end: "09:00" }, at(9, 0))).toBe(false);
  });
});

describe("moving a reminder out of the quiet hours", () => {
  it("leaves a reminder that is already outside alone", () => {
    expect(outsideQuiet("20:00", night)).toBe("20:00");
    expect(outsideQuiet("07:00", night)).toBe("07:00");
    expect(outsideQuiet("20:00", null)).toBe("20:00");
  });

  it("moves one inside the window to the moment the window ends", () => {
    expect(outsideQuiet("23:30", night)).toBe("07:00");
    expect(outsideQuiet("06:00", night)).toBe("07:00");
    expect(outsideQuiet("09:00", day)).toBe("15:00");
  });

  it("passes a malformed time through untouched", () => {
    expect(outsideQuiet("9pm", night)).toBe("9pm");
  });
});

describe("the in-app reminder with quiet hours", () => {
  it("stays silent during quiet hours even after its time", () => {
    expect(shouldShowReminder({ reminderTime: "20:00", quiet: night, now: at(22, 30) })).toBe(false);
    expect(shouldShowReminder({ reminderTime: "20:00", quiet: night, now: at(21, 59) })).toBe(true);
  });

  it("waits for the quiet hours to end when its time falls inside them", () => {
    expect(shouldShowReminder({ reminderTime: "06:00", quiet: night, now: at(6, 30) })).toBe(false);
    expect(shouldShowReminder({ reminderTime: "06:00", quiet: night, now: at(7, 0) })).toBe(true);
    expect(shouldShowReminder({ reminderTime: "09:00", quiet: day, now: at(14, 0) })).toBe(false);
    expect(shouldShowReminder({ reminderTime: "09:00", quiet: day, now: at(15, 30) })).toBe(true);
  });

  it("behaves exactly as before without a window", () => {
    expect(shouldShowReminder({ reminderTime: "20:00", now: at(20, 0) })).toBe(true);
    expect(shouldShowReminder({ reminderTime: "20:00", quiet: null, now: at(19, 59) })).toBe(false);
  });
});

describe("keeping the window on this device only", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data };
  };

  it("saves, reads back, and removes", () => {
    const store = memory();
    writeQuietHours(night, store);
    expect(readQuietHours(store)).toEqual(night);
    expect(JSON.parse(store.data.get(QUIET_HOURS_KEY) ?? "{}")).toEqual(night);
    writeQuietHours(null, store);
    expect(readQuietHours(store)).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it("does not store a window that is not one, and reads a damaged value as none", () => {
    const store = memory();
    writeQuietHours({ start: "22:00", end: "22:00" }, store);
    expect(store.data.size).toBe(0);
    store.setItem(QUIET_HOURS_KEY, "{not json");
    expect(readQuietHours(store)).toBeNull();
    store.setItem(QUIET_HOURS_KEY, JSON.stringify({ start: "99:00", end: "07:00" }));
    expect(readQuietHours(store)).toBeNull();
  });

  it("does nothing, rather than failing, where storage is unavailable", () => {
    expect(() => writeQuietHours(night, null)).not.toThrow();
    expect(readQuietHours(null)).toBeNull();
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(() => writeQuietHours(night, broken)).not.toThrow();
    expect(readQuietHours(broken)).toBeNull();
  });
});
