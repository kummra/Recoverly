import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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
  it("exposes the India helplines: Tele-MANAS on both its numbers, and 112", () => {
    expect(HELPLINES.india.teleManas).toBe("14416");
    expect(HELPLINES.india.teleManasAlt).toBe("1-800-891-4416");
    expect(HELPLINES.india.emergency).toBe("112");
  });

  it("the help message actually contains real numbers and a directory", () => {
    expect(CRISIS_HELP_MESSAGE).toContain(HELPLINES.india.teleManas);
    expect(CRISIS_HELP_MESSAGE).toContain(HELPLINES.india.teleManasAlt);
    expect(CRISIS_HELP_MESSAGE).toContain(HELPLINES.india.emergency);
    expect(CRISIS_HELP_MESSAGE).toContain(HELPLINES.internationalDirectoryUrl);
  });

  it("does not offer the retired KIRAN helpline", () => {
    expect(CRISIS_HELP_MESSAGE).not.toMatch(/kiran|1800-599-0019/i);
  });
});

/** Every app source file except tests. */
function appFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) appFiles(path, out);
    else if (/\.(tsx?|css)$/.test(entry) && !entry.includes(".test.")) out.push(path);
  }
  return out;
}

describe("retired helplines", () => {
  // KIRAN merged into Tele-MANAS in 2024. A number printed in a crisis screen
  // that no longer connects is worse than no number, and it had survived in
  // five places (the banner, the support page, the offline page, the coach's
  // message, the dictionaries) until it was removed on 2026-11-12.
  it("never appear in what a person can read", () => {
    const offenders = appFiles(join(process.cwd(), "src"))
      // safety.ts explains the history in a comment; nothing else may name it.
      .filter((file) => !file.endsWith(join("lib", "safety.ts")))
      .filter((file) => /kiran|1800[-\s]?599[-\s]?0019/i.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
