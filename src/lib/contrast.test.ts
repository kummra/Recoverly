import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  type Rgb,
  composite,
  contrastRatio,
  extractThemeBlocks,
  hslTokenToRgb,
  parseTokens,
  requiredRatio
} from "@/lib/contrast";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const blocks = extractThemeBlocks(css);
const themes = {
  light: parseTokens(blocks.light),
  dark: parseTokens(blocks.dark)
};

/** Tailwind palette entries used as text colour somewhere in the app. */
const PALETTE: Record<string, Rgb> = {
  "emerald-600": [5, 150, 105],
  "emerald-700": [4, 120, 87],
  "emerald-800": [6, 95, 70],
  "sky-600": [2, 132, 199],
  "sky-700": [3, 105, 161]
};

describe("contrast maths", () => {
  it("matches known WCAG reference pairs", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 5);
  });

  it("treats large bold text as the 3:1 tier", () => {
    expect(requiredRatio(14, 400)).toBe(4.5);
    expect(requiredRatio(20, 700)).toBe(3); // large: ≥18.66px and bold
    expect(requiredRatio(20, 400)).toBe(4.5); // same size, not bold — still 4.5
    expect(requiredRatio(24, 400)).toBe(3);
  });

  it("composites alpha rather than assuming the surface is opaque", () => {
    // A 20% emerald tint over white is much lighter than solid emerald; reading
    // the raw colour and ignoring alpha is what produced a false failure.
    const tinted = composite([16, 185, 129], 0.2, [255, 255, 255]);
    expect(relativeLighter(tinted, [16, 185, 129])).toBe(true);
  });
});

function relativeLighter(a: Rgb, b: Rgb) {
  return contrastRatio(a, [0, 0, 0]) > contrastRatio(b, [0, 0, 0]);
}

describe("theme tokens meet WCAG AA", () => {
  // Body copy and captions are normal-size text, so they owe 4.5:1.
  const bodyTextTokens = ["--foreground", "--body", "--subtle", "--muted-foreground"];

  for (const theme of ["light", "dark"] as const) {
    const tokens = themes[theme];
    const bg = hslTokenToRgb(tokens["--background"]);
    const card = hslTokenToRgb(tokens["--card"]);

    it(`${theme}: text tokens clear 4.5:1 on both the page and cards`, () => {
      for (const token of bodyTextTokens) {
        const fg = hslTokenToRgb(tokens[token]);
        expect(contrastRatio(fg, bg), `${theme} ${token} on --background`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(fg, card), `${theme} ${token} on --card`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`${theme}: primary is legible behind its own foreground`, () => {
      // --primary is a button fill; what must be readable is --primary-foreground on it.
      const fill = hslTokenToRgb(tokens["--primary"]);
      const onFill = hslTokenToRgb(tokens["--primary-foreground"]);
      expect(contrastRatio(onFill, fill)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("palette colours used as text", () => {
  const lightBg = hslTokenToRgb(themes.light["--background"]);
  const lightCard = hslTokenToRgb(themes.light["--card"]);

  // Light mode is the strict case: these are mid-tone colours on near-white.
  it("emerald-700 and sky-700 are the safe choices for small text", () => {
    for (const name of ["emerald-700", "sky-700"] as const) {
      expect(contrastRatio(PALETTE[name], lightBg), `${name} on background`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(PALETTE[name], lightCard), `${name} on card`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("documents why emerald-600 is icon-only in light mode", () => {
    // 3.60:1 — fine for icons under the 3:1 non-text rule, not for body text.
    const ratio = contrastRatio(PALETTE["emerald-600"], lightBg);
    expect(ratio).toBeGreaterThanOrEqual(3); // still legal for icons
    expect(ratio).toBeLessThan(4.5); // but not for text — hence the -700 swap
  });

  it("the nav avatar letter clears AA on its emerald tint", () => {
    // bg-emerald-500/20 over the page background, with emerald-800 on top.
    const tint = composite([16, 185, 129], 0.2, lightBg);
    expect(contrastRatio(PALETTE["emerald-800"], tint)).toBeGreaterThanOrEqual(4.5);
  });
});
