/**
 * WCAG contrast maths.
 *
 * These live in code rather than in an ad-hoc browser snippet because the first
 * two passes of the accessibility audit produced false positives: toggling the
 * `.dark` class by hand put the page in a state it can never actually reach
 * (light text variables over a still-dark card), and semi-transparent surfaces
 * were measured as if they were opaque. Pure functions plus a test mean the
 * numbers are reproducible and a regression fails the build instead of waiting
 * for someone to re-run a snippet.
 *
 * Reference: WCAG 2.1 §1.4.3 (text 4.5:1, large text 3:1) and §1.4.11
 * (non-text such as icons, 3:1).
 */

export type Rgb = [number, number, number];

/** `"215 16% 44%"` — the shape Tailwind CSS variables use — to RGB. */
export function hslTokenToRgb(token: string): Rgb {
  const [h, s, l] = token
    .trim()
    .split(/\s+/)
    .map((part) => parseFloat(part));

  const S = s / 100;
  const L = l / 100;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return L - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Composite a translucent colour over an opaque backdrop. */
export function composite(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return [0, 1, 2].map((i) => Math.round(fg[i] * alpha + bg[i] * (1 - alpha))) as Rgb;
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Minimum ratio a piece of text must clear. Large text is ≥24px, or ≥18.66px
 * when bold — the same threshold browsers use for the WCAG "large scale" rule.
 */
export function requiredRatio(fontSizePx: number, fontWeight: number): number {
  const isLarge = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
  return isLarge ? 3 : 4.5;
}

/** Pull `--token: <hsl triple>;` pairs out of a CSS block. */
export function parseTokens(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of css.matchAll(/(--[\w-]+):\s*([\d.]+\s+[\d.]+%\s+[\d.]+%)\s*;/g)) {
    out[match[1]] = match[2];
  }
  return out;
}

/** Isolate the `:root { … }` (light) and `.dark { … }` (dark) blocks. */
export function extractThemeBlocks(css: string): { light: string; dark: string } {
  const grab = (selector: string) => {
    const start = css.indexOf(selector);
    if (start === -1) return "";
    const open = css.indexOf("{", start);
    const close = css.indexOf("}", open);
    return css.slice(open + 1, close);
  };
  return { light: grab(":root {"), dark: grab(".dark {") };
}
