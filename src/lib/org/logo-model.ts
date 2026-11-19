/**
 * What a stored logo is, safe for browsers and the server: the type, the limits and the parser for a stored value. The checks on
 * uploaded bytes (which read the picture itself) are in `logo.ts`, server side only.
 */
export type LogoType = "png" | "jpeg";
export type StoredLogo = { type: LogoType; /** base64 */ data: string; width: number; height: number };

export const LOGO_LIMITS = {
  /** After decoding. A small logo is a few kilobytes. */
  bytesMax: 48_000,
  /** The longest base64 text that can hold `bytesMax` bytes. */
  charsMax: 64_100,
  sideMin: 16,
  sideMax: 512
} as const;

export const LOGO_MIME: Record<LogoType, string> = { png: "image/png", jpeg: "image/jpeg" };

export const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** A stored logo as a record may hold it (anything else is dropped), or `undefined`. */
export function parseLogo(value: unknown): StoredLogo | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { type, data, width, height } = value as Record<string, unknown>;
  if ((type !== "png" && type !== "jpeg") || typeof data !== "string" || data.length > LOGO_LIMITS.charsMax || !BASE64.test(data)) return undefined;
  if (typeof width !== "number" || typeof height !== "number") return undefined;
  return { type, data, width, height };
}
