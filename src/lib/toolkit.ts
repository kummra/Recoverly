/**
 * The organisation toolkit: what a poster or a pocket card says and where its QR
 * code points. Shared by the page that builds a poster (a form), the page that
 * prints one (the server) and the tests, so a poster can be rebuilt from its
 * address alone and never drifts from what the form showed.
 *
 * Nothing here is personal. A poster is made from an organisation's name, an
 * optional programme code and a language, all of which end up printed on a wall.
 */
import { DEFAULT_LOCALE, type Locale, isLocale } from "@/lib/i18n/types";
import { normaliseCode } from "@/lib/programme";
import { BASE_URL } from "@/lib/seo/alternates";

export const MAX_ORG_NAME = 60;

export const POSTER_FORMATS = ["poster", "cards"] as const;
export type PosterFormat = (typeof POSTER_FORMATS)[number];

/** An organisation's name for a poster: one line, no control characters, not too long. */
export function cleanOrgName(value: unknown): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_ORG_NAME);
}

/** Where the QR code leads: the programme's join page, or the home page without a code. */
export function joinUrl(code: string | null): string {
  return code ? `${BASE_URL}/join/${code}` : BASE_URL;
}

/** The address as it is printed under the QR code, without the scheme. */
export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export type PosterSettings = {
  org: string;
  /** A normalised code, or null for none. Whether it exists is checked where it is used. */
  code: string | null;
  locale: Locale;
  format: PosterFormat;
};

type Query = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Settings from a page address. Anything missing or wrong falls back to the plain English poster. */
export function parsePosterSettings(query: Query): PosterSettings {
  const lang = first(query.lang);
  const format = first(query.format);
  return {
    org: cleanOrgName(first(query.org)),
    code: normaliseCode(first(query.code)),
    locale: isLocale(lang) ? lang : DEFAULT_LOCALE,
    format: (POSTER_FORMATS as readonly string[]).includes(format ?? "") ? (format as PosterFormat) : "poster"
  };
}

/** The address of a printable poster or sheet of cards for these settings. Defaults are left out. */
export function posterHref(settings: PosterSettings, path = "/partners/toolkit/poster"): string {
  const params = new URLSearchParams();
  if (settings.org) params.set("org", settings.org);
  if (settings.code) params.set("code", settings.code);
  if (settings.locale !== DEFAULT_LOCALE) params.set("lang", settings.locale);
  if (settings.format !== "poster") params.set("format", settings.format);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
