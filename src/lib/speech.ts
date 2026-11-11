/**
 * Reading text aloud with the phone's own voices.
 *
 * Why it matters here: typing and reading long text in Devanagari, Tamil or
 * Malayalam is slow work for many people, and voice input already exists. Read
 * aloud closes the loop, so someone can speak to the coach and hear the answer,
 * and can listen to a guide instead of reading it.
 *
 * Everything that can be decided without a browser is decided here so it can
 * be tested: which voice, which language a reply is in, and how to cut text so
 * the engines do not stall on it.
 */
import type { Locale } from "@/lib/i18n/types";

/** Region-tagged: speech engines are chosen by region as well as language. */
export const SPEECH_LANG: Record<Locale, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  pa: "pa-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  gu: "gu-IN"
};

export type VoiceLike = { lang: string; localService: boolean };

/** Android reports "hi_IN", desktop "hi-IN", and case varies. */
function normaliseTag(tag: string): string {
  return tag.toLowerCase().replace("_", "-");
}

/**
 * The best installed voice for a language: the exact region first, then any
 * region of the same language. `null` means the device cannot read it, and the
 * button is not shown at all: an English voice reading Tamil is worse than
 * silence.
 *
 * With `localOnly`, voices that run in the cloud are skipped. Some browsers
 * send the text to a server to be spoken; that is fine for a public guide and
 * not for something the person said to the coach.
 */
export function pickVoice<T extends VoiceLike & { lang: string }>(
  voices: readonly T[],
  locale: Locale,
  options: { localOnly: boolean }
): T | null {
  const wanted = normaliseTag(SPEECH_LANG[locale]);
  const language = wanted.split("-")[0];
  const usable = voices.filter((voice) => (options.localOnly ? voice.localService : true));
  return (
    usable.find((voice) => normaliseTag(voice.lang) === wanted) ??
    usable.find((voice) => normaliseTag(voice.lang).split("-")[0] === language) ??
    null
  );
}

/** Unicode ranges for the scripts the app is written in. */
const SCRIPTS: Array<{ locale: Locale; test: RegExp }> = [
  { locale: "hi", test: /[ऀ-ॿ]/g }, // Devanagari (Hindi, and Marathi — see below)
  { locale: "pa", test: /[਀-੿]/g },
  { locale: "gu", test: /[઀-૿]/g },
  { locale: "ta", test: /[஀-௿]/g },
  { locale: "te", test: /[ఀ-౿]/g },
  { locale: "kn", test: /[ಀ-೿]/g },
  { locale: "ml", test: /[ഀ-ൿ]/g }
];

/**
 * The language a piece of text is written in, as far as a voice is concerned.
 *
 * The coach answers in whatever language the person wrote in, which is not
 * always the language the app is set to. Choosing the voice by the app's
 * language would read a Hindi reply in an English voice. Marathi shares
 * Devanagari with Hindi, so it is kept when that is the app's language.
 * Text with no Indic script, including romanised Hindi, is read in English.
 */
export function speechLocaleFor(text: string, appLocale: Locale): Locale {
  let best: { locale: Locale; count: number } = { locale: "en", count: 0 };
  for (const script of SCRIPTS) {
    const count = text.match(script.test)?.length ?? 0;
    if (count > best.count) best = { locale: script.locale, count };
  }
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  // A few borrowed words in a script do not make a text in that language.
  if (best.count === 0 || best.count < letters * 0.3) return "en";
  if (best.locale === "hi" && appLocale === "mr") return "mr";
  return best.locale;
}

/**
 * Cut text into pieces a speech engine will finish. Browsers stop an utterance
 * that runs long (Chrome after about fifteen seconds), and pieces make stopping
 * and moving on clean. Pieces end at sentence breaks where they can, including
 * the Devanagari danda, and a very long sentence is cut at a space.
 *
 * Line breaks count as breaks: a heading and the paragraph under it should not
 * be read as one run-on sentence.
 */
export function splitForSpeech(text: string, max = 180): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((line) => (/[.!?:;।॥]$/.test(line) ? line : `${line}.`));

  const sentences = lines.join(" ").split(/(?<=[.!?।॥])\s+/).filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  const flush = () => {
    if (current) chunks.push(current);
    current = "";
  };

  for (const sentence of sentences) {
    if (sentence.length > max) {
      flush();
      let rest = sentence;
      while (rest.length > max) {
        const space = rest.lastIndexOf(" ", max);
        const at = space > max * 0.5 ? space : max;
        chunks.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      current = rest;
      continue;
    }
    if (current && current.length + 1 + sentence.length > max) flush();
    current = current ? `${current} ${sentence}` : sentence;
  }
  flush();
  return chunks;
}

/** Helpline numbers are dialled, not counted. Heard as a quantity, "14416"
 *  becomes "fourteen thousand four hundred sixteen", which no one can write down. */
const DIAL_NUMBERS = ["1-800-891-4416", "14416", "14446", "14490", "112", "181"];

function spellDigits(number: string): string {
  return number.replace(/\D/g, "").split("").join(" ");
}

/**
 * Text as it should be heard: helplines digit by digit, links as the site's
 * name, and the marks that a voice would read out (asterisks, hashes, bullets,
 * emoji) taken away. The coach writes in light formatting, and a voice that
 * says "star star" would sound broken.
 *
 * Only the known helpline numbers are spelled out. Other numbers, a volume in
 * ml or a year, are meant to be heard as numbers and are left alone.
 */
export function prepareForSpeech(text: string): string {
  let out = text.replace(/https?:\/\/(?:www\.)?([^\s/]+)\S*/g, "$1");
  for (const number of DIAL_NUMBERS) {
    const escaped = number.replace(/-/g, "\\-");
    out = out.replace(new RegExp(`(?<![\\d-])${escaped}(?![\\d-])(?!\\s*ml\\b)`, "gi"), spellDigits(number));
  }
  return out
    .replace(/[•▪◦]/g, "\n")
    .replace(/[*_`#~]+/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "");
}

/**
 * The words on the page worth reading, in order: headings, paragraphs and list
 * items, leaving out anything marked `data-no-speech` (buttons, dates, source
 * lists). Taking text from these elements rather than from `innerText` keeps
 * the controls themselves out of what is read.
 */
export function readableText(root: ParentNode): string {
  const lines: string[] = [];
  root.querySelectorAll<HTMLElement>("h1,h2,h3,p,li").forEach((node) => {
    if (node.closest("[data-no-speech]")) return;
    const text = node.textContent?.trim();
    if (text) lines.push(text);
  });
  return lines.join("\n");
}
