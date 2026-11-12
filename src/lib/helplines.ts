/**
 * The national helplines as a small, always-current card that other sites and
 * apps can use: the "safety layer" an organisation can put in front of its own
 * people without keeping the numbers up to date itself.
 *
 * One source for the public JSON feed (`/api/helplines`) and the embeddable card
 * (`/embed/help`), built from the same constants and the same reviewed,
 * translated wording the app itself shows (`lib/safety.ts` and the dictionaries).
 * That is the point: when a number changes, as one national line's did in 2024, it changes here once
 * and every site that embeds the card is right the next time it loads.
 *
 * Only what the app already treats as the national lines: Tele-MANAS and 112.
 * Never add a number that has not been checked against an official source.
 */
import { createTranslator } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale, isLocale } from "@/lib/i18n/types";
import { HELPLINES } from "@/lib/safety";
import { BASE_URL } from "@/lib/seo/alternates";

/**
 * When these numbers were last checked against the official pages listed in the
 * guides' sources (`content/learn/meta.ts`). Update it whenever they are
 * re-checked, so a site that reads the feed can tell how fresh it is.
 */
export const HELPLINES_CHECKED = "2026-10-11";

export type HelplineEntry = {
  id: "tele-manas" | "emergency";
  name: string;
  /** What to dial, with no spaces or hyphens: safe to put straight into `tel:`. */
  number: string;
  /** Another way to reach the same service, as it is usually written. */
  alternateNumber?: string;
  detail: string;
};

export type HelplineCard = {
  country: "IN";
  language: Locale;
  checked: string;
  /** "In crisis or thinking about self-harm? Help is available now", in `language`. */
  title: string;
  helplines: HelplineEntry[];
  /** "Support, not medical advice" and the sudden-stop warning, in `language`. */
  notice: string;
  provider: { name: string; url: string };
};

/** The language asked for, or English for anything we do not publish. */
export function parseLang(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function buildHelplineCard(locale: Locale = DEFAULT_LOCALE): HelplineCard {
  const t = createTranslator(locale);
  return {
    country: "IN",
    language: locale,
    checked: HELPLINES_CHECKED,
    title: t("safety.crisisTitle"),
    helplines: [
      {
        id: "tele-manas",
        name: t("support.teleManasName"),
        number: HELPLINES.india.teleManas,
        alternateNumber: HELPLINES.india.teleManasAlt,
        detail: t("support.teleManasDetail")
      },
      {
        id: "emergency",
        name: t("support.emergencyName"),
        number: HELPLINES.india.emergency,
        detail: t("support.emergencyDetail")
      }
    ],
    notice: t("safety.notMedicalBody"),
    provider: { name: "Recoverly", url: BASE_URL }
  };
}

/** `tel:` target for a number as written ("1-800-891-4416" becomes "tel:18008914416"). */
export function telHref(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, "")}`;
}
