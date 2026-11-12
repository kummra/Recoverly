import { describe, expect, it } from "vitest";

import { MAX_QR_VERSION, byteCapacity, encodeQr, qrSvgPath, reedSolomonRemainder } from "@/lib/qr";

/**
 * These cover the arithmetic and the fixed parts of the picture. They cannot say
 * whether a phone will read the result: `node scripts/verify-qr.mjs` does that,
 * against the operating system's own decoder, and must be run after any change.
 */

describe("Reed-Solomon", () => {
  it("matches a published worked example (version 1-M)", () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(reedSolomonRemainder(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });
});

describe("capacity", () => {
  it("is the standard's byte-mode capacity at level M, versions 1 to 10", () => {
    expect(Array.from({ length: MAX_QR_VERSION }, (_, i) => byteCapacity(i + 1))).toEqual([14, 26, 42, 62, 84, 106, 122, 152, 180, 213]);
  });

  it("chooses the smallest version that fits, and says when nothing does", () => {
    expect(encodeQr("x".repeat(14)).version).toBe(1);
    expect(encodeQr("x".repeat(15)).version).toBe(2);
    expect(encodeQr("x".repeat(42)).version).toBe(3);
    expect(encodeQr("x".repeat(43)).version).toBe(4);
    expect(encodeQr("x".repeat(213)).version).toBe(10);
    expect(() => encodeQr("x".repeat(214))).toThrow(/too long/);
  });

  it("counts bytes, not characters", () => {
    // Eight Devanagari letters are 24 bytes in UTF-8.
    expect(encodeQr("नमस्तेनमस्ते".slice(0, 8)).version).toBe(2);
  });

  it("fits every programme web address (code up to 16 characters)", () => {
    expect(encodeQr("https://recoverly.co.in/join/ABCDEFGHIJKLMNOP").version).toBeLessThanOrEqual(4);
  });
});

describe("the picture", () => {
  const code = encodeQr("https://recoverly.co.in/join/SAMPLE");
  const { size } = code;

  it("is 17 + 4 × version modules wide", () => {
    expect(size).toBe(17 + 4 * code.version);
  });

  it("has a finder pattern in three corners and none in the fourth", () => {
    const finder = (cx: number, cy: number) => {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const ring = Math.max(Math.abs(dx), Math.abs(dy));
          if (code.isDark(cx + dx, cy + dy) !== (ring !== 2)) return false;
        }
      }
      return true;
    };
    expect(finder(3, 3)).toBe(true);
    expect(finder(size - 4, 3)).toBe(true);
    expect(finder(3, size - 4)).toBe(true);
    expect(finder(size - 4, size - 4)).toBe(false);
  });

  it("keeps a blank line around each finder pattern", () => {
    for (let i = 0; i < 8; i++) {
      expect(code.isDark(7, i)).toBe(false);
      expect(code.isDark(i, 7)).toBe(false);
      expect(code.isDark(size - 8, i)).toBe(false);
      expect(code.isDark(size - 1 - i, 7)).toBe(false);
      expect(code.isDark(7, size - 1 - i)).toBe(false);
      expect(code.isDark(i, size - 8)).toBe(false);
    }
  });

  it("alternates along the timing lines between the finders", () => {
    for (let i = 8; i < size - 8; i++) {
      expect(code.isDark(6, i)).toBe(i % 2 === 0);
      expect(code.isDark(i, 6)).toBe(i % 2 === 0);
    }
  });

  it("has the always-dark module", () => {
    expect(code.isDark(8, size - 8)).toBe(true);
  });

  it("writes valid format bits, twice: level M and the mask that was used", () => {
    const readFirst = () => {
      let bits = 0;
      const place = (i: number, x: number, y: number) => {
        if (code.isDark(x, y)) bits |= 1 << i;
      };
      for (let i = 0; i <= 5; i++) place(i, 8, i);
      place(6, 8, 7);
      place(7, 8, 8);
      place(8, 7, 8);
      for (let i = 9; i < 15; i++) place(i, 14 - i, 8);
      return bits;
    };
    const readSecond = () => {
      let bits = 0;
      for (let i = 0; i < 8; i++) if (code.isDark(size - 1 - i, 8)) bits |= 1 << i;
      for (let i = 8; i < 15; i++) if (code.isDark(8, size - 15 + i)) bits |= 1 << i;
      return bits;
    };
    const first = readFirst();
    expect(readSecond()).toBe(first);

    const data = (first ^ 0x5412) >>> 10;
    expect(data >>> 3).toBe(0); // level M
    expect(data & 7).toBe(code.mask);
    let remainder = data;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    expect(((data << 10) | remainder) ^ 0x5412).toBe(first);
  });

  it("is the same for the same text and different for different text", () => {
    const grid = (c: ReturnType<typeof encodeQr>) => Array.from({ length: c.size }, (_, y) => Array.from({ length: c.size }, (_, x) => (c.isDark(x, y) ? "#" : ".")).join("")).join("\n");
    expect(grid(encodeQr("https://recoverly.co.in/join/SAMPLE"))).toBe(grid(code));
    expect(grid(encodeQr("https://recoverly.co.in/join/SAMPLF"))).not.toBe(grid(code));
  });

  it("answers false outside the picture", () => {
    expect(code.isDark(-1, 0)).toBe(false);
    expect(code.isDark(0, size)).toBe(false);
  });

  it("can be forced to each mask, for the scanner check", () => {
    for (let mask = 0; mask < 8; mask++) expect(encodeQr("A", { mask }).mask).toBe(mask);
  });
});

describe("qrSvgPath", () => {
  const code = encodeQr("https://recoverly.co.in");

  it("draws exactly the dark modules, inside a four-module margin", () => {
    const { d, viewBox } = qrSvgPath(code);
    expect(viewBox).toBe(code.size + 8);

    let drawn = 0;
    for (const match of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) {
      const [x, y, run] = [Number(match[1]), Number(match[2]), Number(match[3])];
      expect(match[4]).toBe(match[3]);
      expect(x).toBeGreaterThanOrEqual(4);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(x + run).toBeLessThanOrEqual(code.size + 4);
      drawn += run;
    }
    let dark = 0;
    for (let y = 0; y < code.size; y++) for (let x = 0; x < code.size; x++) if (code.isDark(x, y)) dark++;
    expect(drawn).toBe(dark);
    expect(d.replace(/M\d+ \d+h\d+v1h-\d+z/g, "")).toBe("");
  });
});
