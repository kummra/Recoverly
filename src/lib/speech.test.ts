import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/types";
import { SPEECH_LANG, pickVoice, prepareForSpeech, speechLocaleFor, splitForSpeech } from "@/lib/speech";

const voice = (lang: string, localService = true) => ({ lang, localService, name: lang });

describe("SPEECH_LANG", () => {
  it("has a region-tagged language for every language the app has", () => {
    for (const locale of LOCALES) expect(SPEECH_LANG[locale]).toMatch(/^[a-z]{2}-IN$/);
  });
});

describe("pickVoice", () => {
  it("prefers the exact region", () => {
    const picked = pickVoice([voice("hi-US"), voice("hi-IN")], "hi", { localOnly: false });
    expect(picked?.lang).toBe("hi-IN");
  });

  it("falls back to the same language in another region", () => {
    expect(pickVoice([voice("en-GB")], "en", { localOnly: false })?.lang).toBe("en-GB");
  });

  it("understands the underscore Android uses", () => {
    expect(pickVoice([voice("ta_IN")], "ta", { localOnly: false })?.lang).toBe("ta_IN");
  });

  it("returns nothing when no voice speaks the language, rather than a wrong one", () => {
    expect(pickVoice([voice("en-US"), voice("fr-FR")], "ml", { localOnly: false })).toBeNull();
    expect(pickVoice([], "hi", { localOnly: false })).toBeNull();
  });

  it("skips cloud voices when the text must stay on the device", () => {
    const voices = [voice("hi-IN", false)];
    expect(pickVoice(voices, "hi", { localOnly: true })).toBeNull();
    expect(pickVoice(voices, "hi", { localOnly: false })).not.toBeNull();
  });

  it("takes a local voice over a cloud one when both exist", () => {
    const picked = pickVoice([voice("hi-IN", false), voice("hi-IN", true)], "hi", { localOnly: true });
    expect(picked?.localService).toBe(true);
  });
});

describe("speechLocaleFor", () => {
  it("reads each script in its own language, whatever the app is set to", () => {
    expect(speechLocaleFor("आज का दिन कठिन था", "en")).toBe("hi");
    expect(speechLocaleFor("ਅੱਜ ਦਾ ਦਿਨ ਔਖਾ ਸੀ", "en")).toBe("pa");
    expect(speechLocaleFor("આજનો દિવસ મુશ્કેલ હતો", "en")).toBe("gu");
    expect(speechLocaleFor("இன்று கடினமான நாள்", "en")).toBe("ta");
    expect(speechLocaleFor("ఈ రోజు కష్టంగా ఉంది", "en")).toBe("te");
    expect(speechLocaleFor("ಇಂದು ಕಷ್ಟದ ದಿನ", "en")).toBe("kn");
    expect(speechLocaleFor("ഇന്ന് ബുദ്ധിമുട്ടുള്ള ദിവസം", "en")).toBe("ml");
  });

  it("keeps Marathi when the app is in Marathi, since it shares a script with Hindi", () => {
    expect(speechLocaleFor("आजचा दिवस कठीण होता", "mr")).toBe("mr");
    expect(speechLocaleFor("आजचा दिवस कठीण होता", "hi")).toBe("hi");
  });

  it("reads Latin text, including romanised Hindi, in English", () => {
    expect(speechLocaleFor("I had a hard day", "hi")).toBe("en");
    expect(speechLocaleFor("aaj ka din mushkil tha", "hi")).toBe("en");
  });

  it("is not fooled by a few borrowed words in a script", () => {
    expect(speechLocaleFor("I called Tele-MANAS and they said ठीक है", "hi")).toBe("en");
  });

  it("copes with empty text", () => {
    expect(speechLocaleFor("", "ta")).toBe("en");
  });
});

describe("splitForSpeech", () => {
  it("keeps short text in one piece", () => {
    expect(splitForSpeech("A short sentence.")).toEqual(["A short sentence."]);
  });

  it("breaks at sentence ends and packs sentences up to the limit", () => {
    const text = "One two three. Four five six. Seven eight nine. Ten eleven twelve.";
    const chunks = splitForSpeech(text, 32);
    expect(chunks.every((c) => c.length <= 32)).toBe(true);
    expect(chunks.join(" ")).toBe(text);
  });

  it("treats the Devanagari danda as a sentence end", () => {
    const chunks = splitForSpeech("पहला वाक्य। दूसरा वाक्य। तीसरा वाक्य।", 14);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(" ")).toBe("पहला वाक्य। दूसरा वाक्य। तीसरा वाक्य।");
  });

  it("keeps a heading apart from the paragraph under it", () => {
    const chunks = splitForSpeech("A heading\nThe paragraph that follows it.", 20);
    expect(chunks[0]).toBe("A heading.");
  });

  it("cuts a sentence that is too long at a space, and loses no words", () => {
    const sentence = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const chunks = splitForSpeech(sentence, 50);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.every((c) => c.length <= 50)).toBe(true);
    expect(chunks.join(" ").replace(/\.$/, "")).toBe(sentence);
  });

  it("cuts a very long unbroken run, since there is no space to cut at", () => {
    const chunks = splitForSpeech("x".repeat(500), 100);
    expect(chunks.every((c) => c.length <= 101)).toBe(true);
    expect(chunks.join("").replace(/\.$/, "").length).toBe(500);
  });

  it("returns nothing for nothing", () => {
    expect(splitForSpeech("")).toEqual([]);
    expect(splitForSpeech("  \n \n ")).toEqual([]);
  });
});

describe("prepareForSpeech", () => {
  it("spells a helpline digit by digit, so it can be written down", () => {
    expect(prepareForSpeech("Call Tele-MANAS 14416 any time.")).toBe("Call Tele-MANAS 1 4 4 1 6 any time.");
    expect(prepareForSpeech("In an emergency call 112.")).toBe("In an emergency call 1 1 2.");
  });

  it("spells the toll-free number whole, not in pieces", () => {
    expect(prepareForSpeech("or 1-800-891-4416")).toBe("or 1 8 0 0 8 9 1 4 4 1 6");
  });

  it("spells every helpline the guides print", () => {
    for (const [number, spoken] of [
      ["14446", "1 4 4 4 6"],
      ["14490", "1 4 4 9 0"],
      ["181", "1 8 1"]
    ]) {
      expect(prepareForSpeech(`Number ${number}.`)).toBe(`Number ${spoken}.`);
    }
  });

  it("leaves other numbers alone: a year, a volume, a count", () => {
    expect(prepareForSpeech("A 2018 survey found 5.7 crore people.")).toBe("A 2018 survey found 5.7 crore people.");
    expect(prepareForSpeech("A bottle of 330 ml and 14 units.")).toBe("A bottle of 330 ml and 14 units.");
  });

  it("does not take a helpline out of the middle of a longer number", () => {
    expect(prepareForSpeech("code 1120 and 21121 and 144160")).toBe("code 1120 and 21121 and 144160");
    expect(prepareForSpeech("a drink of 112 ml")).toBe("a drink of 112 ml");
  });

  it("removes marks a voice would read out", () => {
    expect(prepareForSpeech("**Tell someone** you trust")).toBe("Tell someone you trust");
    expect(prepareForSpeech("## Heading with `code`")).toBe(" Heading with code");
    expect(prepareForSpeech("Well done \u{1F331}\u{1F31F}")).toBe("Well done ");
  });

  it("turns bullets into line breaks, which become pauses", () => {
    expect(prepareForSpeech("• first • second")).toBe("\n first \n second");
  });

  it("says a link as the site it points to", () => {
    expect(prepareForSpeech("see https://findahelpline.com/in/support for more")).toBe("see findahelpline.com for more");
    expect(prepareForSpeech("see https://www.who.int/health-topics/alcohol.")).toBe("see who.int");
  });
});
