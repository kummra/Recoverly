/**
 * An organisation's logo, shown beside its name on the person's dashboard. SERVER side checks only (it uses `Buffer`).
 *
 * Why it is held and served by us and not linked from the organisation's own site: an image loaded from someone else's server
 * tells that server who looked at it and when, and a person's use of Recoverly is private. So the image is stored in the
 * organisation's record and served from our own address, and a lookup of it carries nothing but the programme code, like the lookup
 * of the words.
 *
 * Why only small PNG and JPEG: they are the formats a phone shows without any script, and this check reads the real bytes (the
 * file signature and the true width and height), not what the browser claims. SVG is refused outright because it can carry script.
 * The portal shrinks and re-encodes a chosen picture in the browser first, which also strips anything hidden inside it; this is
 * the server's own check of whatever arrives, because a request does not have to come from the portal.
 *
 * Like the words, a new logo is a draft until the owner approves it: a logo is the quickest way to pass for another organisation.
 */
import { BASE64, LOGO_LIMITS, type StoredLogo } from "@/lib/org/logo-model";

export { BASE64, LOGO_LIMITS, LOGO_MIME, type LogoType, type StoredLogo, parseLogo } from "@/lib/org/logo-model";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const u16 = (b: Uint8Array, at: number) => (b[at] << 8) | b[at + 1];
const u32 = (b: Uint8Array, at: number) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;

/** The size a PNG says it is, if it begins like a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 33 || PNG_SIGNATURE.some((value, index) => bytes[index] !== value)) return null;
  // The first chunk must be IHDR: length 13, then the four letters.
  if (u32(bytes, 8) !== 13 || bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) return null;
  return { width: u32(bytes, 16), height: u32(bytes, 20) };
}

/** The size a JPEG says it is, found in its first start-of-frame marker. */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return null;
    while (bytes[at + 1] === 0xff) at += 1;
    const marker = bytes[at + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    const length = u16(bytes, at + 2);
    if (length < 2) return null;
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return at + 9 <= bytes.length ? { height: u16(bytes, at + 5), width: u16(bytes, at + 7) } : null;
    at += 2 + length;
  }
  return null;
}

export type LogoCheck = { logo: StoredLogo; error?: undefined } | { logo?: undefined; error: string };

/** Check what was sent: `{ type, data }` with `data` as base64. Returns the logo exactly as it will be stored, or a sentence saying what is wrong. */
export function checkLogo(input: unknown): LogoCheck {
  if (typeof input !== "object" || input === null) return { error: "No logo was sent." };
  const { type, data } = input as Record<string, unknown>;
  if (type !== "png" && type !== "jpeg") return { error: "The logo must be a PNG or a JPEG picture." };
  if (typeof data !== "string" || data.length === 0 || data.length > LOGO_LIMITS.charsMax || !BASE64.test(data) || data.length % 4 !== 0) {
    return { error: `The logo is too large or not a valid picture. Keep it under ${Math.round(LOGO_LIMITS.bytesMax / 1000)} KB.` };
  }
  const bytes = new Uint8Array(Buffer.from(data, "base64"));
  if (bytes.length > LOGO_LIMITS.bytesMax) return { error: `The logo is too large. Keep it under ${Math.round(LOGO_LIMITS.bytesMax / 1000)} KB.` };
  const size = type === "png" ? pngSize(bytes) : jpegSize(bytes);
  if (!size) return { error: "That file is not a real PNG or JPEG picture." };
  const { width, height } = size;
  if (width < LOGO_LIMITS.sideMin || height < LOGO_LIMITS.sideMin || width > LOGO_LIMITS.sideMax || height > LOGO_LIMITS.sideMax) {
    return { error: `The logo must be between ${LOGO_LIMITS.sideMin} and ${LOGO_LIMITS.sideMax} pixels on each side.` };
  }
  // Store what was checked, written back out, so nothing but the checked bytes is ever kept.
  return { logo: { type, data: Buffer.from(bytes).toString("base64"), width, height } };
}

export const logoBytes = (logo: StoredLogo): Buffer => Buffer.from(logo.data, "base64");
