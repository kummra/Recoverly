import { describe, expect, it } from "vitest";

import { CRISIS_HELP_MESSAGE, HELPLINES, detectCrisis } from "@/lib/safety";

describe("detectCrisis", () => {
  // These MUST trigger the helpline. A miss here is the worst-case failure.
  const crisisPhrases = [
    "I want to kill myself",
    "i am going to kill myself tonight",
    "thinking about suicide",
    "I feel suicidal",
    "I've been self-harming",
    "I want to hurt myself",
    "i just want to die",
    "I want to end my life",
    "I'm going to end it all",
    "I want to take my own life",
    "I don't want to live anymore",
    "there's no reason to live",
    "everyone would be better off without me",
    "I can't go on anymore",
    "I can't do this anymore",
    "I think I'm going to overdose"
  ];

  it.each(crisisPhrases)("flags crisis language: %s", (phrase) => {
    expect(detectCrisis(phrase)).toBe(true);
  });

  // Ordinary recovery talk must NOT be misread as crisis (avoid false alarms
  // that would bury real help behind noise / feel alarmist to a vulnerable user).
  const recoveryPhrases = [
    "I want to cut down on drinking",
    "I'm trying to quit alcohol",
    "I had a hard day but I'm okay",
    "I want to stop drinking beer",
    "I'm cutting back this week",
    "today I killed it at the gym",
    "this craving is killing me but I'm pushing through"
  ];

  it.each(recoveryPhrases)("does not flag ordinary recovery talk: %s", (phrase) => {
    expect(detectCrisis(phrase)).toBe(false);
  });

  it("handles empty / null / undefined safely", () => {
    expect(detectCrisis("")).toBe(false);
    expect(detectCrisis(null)).toBe(false);
    expect(detectCrisis(undefined)).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(detectCrisis("I WANT TO KILL MYSELF")).toBe(true);
  });
});

describe("crisis help content", () => {
  it("exposes the India helplines", () => {
    expect(HELPLINES.india.teleManas).toBe("14416");
    expect(HELPLINES.india.kiran).toBe("1800-599-0019");
    expect(HELPLINES.india.emergency).toBe("112");
  });

  it("the help message actually contains real numbers and a directory", () => {
    expect(CRISIS_HELP_MESSAGE).toContain(HELPLINES.india.teleManas);
    expect(CRISIS_HELP_MESSAGE).toContain(HELPLINES.india.kiran);
    expect(CRISIS_HELP_MESSAGE).toContain(HELPLINES.india.emergency);
    expect(CRISIS_HELP_MESSAGE).toContain(HELPLINES.internationalDirectoryUrl);
  });
});
