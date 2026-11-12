/**
 * A small QR code encoder: byte mode, error-correction level M, versions 1 to 10
 * (up to 213 bytes). A web address for a poster needs nothing more, and writing
 * it here means the site takes on no dependency for one drawing.
 *
 * Self-contained on purpose (no imports), so it can be run directly by Node for
 * the scanner check in `scripts/verify-qr.mjs`. A printed code that does not scan
 * is a worse failure than no code, so that check, which decodes the pictures
 * with the operating system's own QR reader, must be run after any change here.
 * `qr.test.ts` covers the arithmetic and the fixed patterns.
 *
 * Layout follows ISO/IEC 18004: function patterns, Reed-Solomon over GF(256)
 * with the 0x11D polynomial, block interleaving, the zigzag placement, eight
 * masks scored by the four penalty rules, then the format bits.
 */

export const MAX_QR_VERSION = 10;

/** Index = version. Level M only. */
const EC_CODEWORDS_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

/** Level M is "00" in the format bits. */
const FORMAT_BITS_M = 0;

export type QrCode = {
  version: number;
  /** Modules per side (17 + 4 × version). */
  size: number;
  mask: number;
  /** Column `x`, row `y`; true is a dark module. */
  isDark: (x: number, y: number) => boolean;
};

function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function totalCodewords(version: number): number {
  return Math.floor(rawDataModules(version) / 8);
}

function dataCodewords(version: number): number {
  return totalCodewords(version) - EC_CODEWORDS_PER_BLOCK[version] * NUM_BLOCKS[version];
}

/** Bytes of text that fit at level M in this version. */
export function byteCapacity(version: number): number {
  const countBits = version <= 9 ? 8 : 16;
  return Math.floor((dataCodewords(version) * 8 - 4 - countBits) / 8);
}

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

/** The error-correction codewords for one block of data. Exported for the test. */
export function reedSolomonRemainder(data: readonly number[], degree: number): number[] {
  const divisor = reedSolomonDivisor(degree);
  const result = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coefficient, i) => {
      result[i] ^= gfMultiply(coefficient, factor);
    });
  }
  return result;
}

function toDataCodewords(bytes: Uint8Array, version: number): number[] {
  const bits: number[] = [];
  const push = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4); // byte mode
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);

  const capacityBits = dataCodewords(version) * 8;
  push(0, Math.min(4, capacityBits - bits.length)); // terminator
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) push(pad, 8);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j++) value = (value << 1) | bits[i + j];
    codewords.push(value);
  }
  return codewords;
}

/** Split into blocks, add error correction, and interleave as the standard requires. */
function addErrorCorrectionAndInterleave(data: number[], version: number): number[] {
  const numBlocks = NUM_BLOCKS[version];
  const ecLength = EC_CODEWORDS_PER_BLOCK[version];
  const total = totalCodewords(version);
  const numShortBlocks = numBlocks - (total % numBlocks);
  const shortBlockLength = Math.floor(total / numBlocks);

  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];
  for (let i = 0, offset = 0; i < numBlocks; i++) {
    const length = shortBlockLength - ecLength + (i < numShortBlocks ? 0 : 1);
    const block = data.slice(offset, offset + length);
    offset += length;
    blocks.push(block);
    ecBlocks.push(reedSolomonRemainder(block, ecLength));
  }

  const result: number[] = [];
  const longest = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < longest; i++) for (const block of blocks) if (i < block.length) result.push(block[i]);
  for (let i = 0; i < ecLength; i++) for (const ec of ecBlocks) result.push(ec[i]);
  return result;
}

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const positions = [6];
  for (let pos = size - 7; positions.length < count; pos -= step) positions.splice(1, 0, pos);
  return positions;
}

const bit = (value: number, index: number) => ((value >>> index) & 1) !== 0;

class Grid {
  readonly version: number;
  readonly size: number;
  readonly dark: boolean[][];
  readonly fixed: boolean[][];

  // No constructor parameter properties: Node's built-in TypeScript support
  // (used by scripts/verify-qr.mjs) only strips types, it cannot rewrite those.
  constructor(version: number) {
    this.version = version;
    this.size = version * 4 + 17;
    this.dark = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.fixed = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
  }

  /** Mark a module as part of a function pattern (never masked, never data). */
  setFixed(x: number, y: number, isDark: boolean) {
    this.dark[y][x] = isDark;
    this.fixed[y][x] = true;
  }

  drawFunctionPatterns() {
    const { size } = this;
    for (let i = 0; i < size; i++) {
      this.setFixed(6, i, i % 2 === 0);
      this.setFixed(i, 6, i % 2 === 0);
    }
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < size && y >= 0 && y < size) this.setFixed(x, y, distance !== 2 && distance !== 4);
        }
      }
    }
    const positions = alignmentPositions(this.version);
    const last = positions.length - 1;
    positions.forEach((cy, i) => {
      positions.forEach((cx, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.setFixed(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      });
    });
    this.drawFormat(0); // reserves the area; redrawn once the mask is chosen
    this.drawVersion();
  }

  drawFormat(mask: number) {
    const data = (FORMAT_BITS_M << 3) | mask;
    let remainder = data;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const bits = ((data << 10) | remainder) ^ 0x5412;
    const { size } = this;

    for (let i = 0; i <= 5; i++) this.setFixed(8, i, bit(bits, i));
    this.setFixed(8, 7, bit(bits, 6));
    this.setFixed(8, 8, bit(bits, 7));
    this.setFixed(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) this.setFixed(14 - i, 8, bit(bits, i));

    for (let i = 0; i < 8; i++) this.setFixed(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) this.setFixed(8, size - 15 + i, bit(bits, i));
    this.setFixed(8, size - 8, true); // the always-dark module
  }

  drawVersion() {
    if (this.version < 7) return;
    let remainder = this.version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const bits = (this.version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFixed(a, b, bit(bits, i));
      this.setFixed(b, a, bit(bits, i));
    }
  }

  placeCodewords(codewords: number[]) {
    const { size } = this;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < size; vertical++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vertical : vertical;
          if (!this.fixed[y][x] && i < codewords.length * 8) {
            this.dark[y][x] = bit(codewords[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  applyMask(mask: number) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert: boolean;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0; break;
          default: invert = ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0; break;
        }
        if (!this.fixed[y][x] && invert) this.dark[y][x] = !this.dark[y][x];
      }
    }
  }

  /** The four penalty rules of the standard: runs, 2×2 blocks, finder-like
   *  patterns and dark/light balance. Lower reads more reliably. */
  penalty(): number {
    const { size, dark } = this;
    let result = 0;
    for (let direction = 0; direction < 2; direction++) {
      for (let a = 0; a < size; a++) {
        const at = (i: number) => (direction === 0 ? dark[a][i] : dark[i][a]);
        let run = 1;
        for (let i = 1; i < size; i++) {
          if (at(i) === at(i - 1)) {
            run++;
          } else {
            if (run >= 5) result += 3 + (run - 5);
            run = 1;
          }
        }
        if (run >= 5) result += 3 + (run - 5);

        for (let i = 0; i + 7 <= size; i++) {
          if (at(i) && !at(i + 1) && at(i + 2) && at(i + 3) && at(i + 4) && !at(i + 5) && at(i + 6)) {
            const lightBefore = i >= 4 && !at(i - 4) && !at(i - 3) && !at(i - 2) && !at(i - 1);
            const lightAfter = i + 11 <= size && !at(i + 7) && !at(i + 8) && !at(i + 9) && !at(i + 10);
            if (lightBefore) result += 40;
            if (lightAfter) result += 40;
          }
        }
      }
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const colour = dark[y][x];
        if (colour === dark[y][x + 1] && colour === dark[y + 1][x] && colour === dark[y + 1][x + 1]) result += 3;
      }
    }
    let darkCount = 0;
    for (const row of dark) for (const cell of row) if (cell) darkCount++;
    const total = size * size;
    result += (Math.ceil(Math.abs(darkCount * 20 - total * 10) / total) - 1) * 10;
    return result;
  }
}

/**
 * Encode text (as UTF-8 bytes) at level M. Throws if it does not fit in version 10.
 * `options.mask` forces one of the eight masks; it exists so the scanner check can
 * prove that every mask decodes, and the site never sets it.
 */
export function encodeQr(text: string, options: { mask?: number } = {}): QrCode {
  const bytes = new TextEncoder().encode(text);
  let version = 1;
  while (version <= MAX_QR_VERSION && bytes.length > byteCapacity(version)) version++;
  if (version > MAX_QR_VERSION) throw new Error(`QR: ${bytes.length} bytes is too long (the most is ${byteCapacity(MAX_QR_VERSION)})`);

  const codewords = addErrorCorrectionAndInterleave(toDataCodewords(bytes, version), version);
  const grid = new Grid(version);
  grid.drawFunctionPatterns();
  grid.placeCodewords(codewords);

  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    if (options.mask !== undefined && mask !== options.mask) continue;
    grid.applyMask(mask);
    grid.drawFormat(mask);
    const penalty = grid.penalty();
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
    }
    grid.applyMask(mask); // undo
  }
  grid.applyMask(bestMask);
  grid.drawFormat(bestMask);

  return { version, size: grid.size, mask: bestMask, isDark: (x, y) => x >= 0 && y >= 0 && x < grid.size && y < grid.size && grid.dark[y][x] };
}

/**
 * The code as one SVG path (runs of dark modules drawn as rectangles) with the
 * blank margin the standard asks for (four modules), so a scanner can find it.
 * `viewBox` is the side of the square to give the SVG.
 */
export function qrSvgPath(code: QrCode, quietZone = 4): { d: string; viewBox: number } {
  const parts: string[] = [];
  for (let y = 0; y < code.size; y++) {
    let x = 0;
    while (x < code.size) {
      if (!code.isDark(x, y)) {
        x++;
        continue;
      }
      let end = x;
      while (end < code.size && code.isDark(end, y)) end++;
      parts.push(`M${x + quietZone} ${y + quietZone}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  }
  return { d: parts.join(""), viewBox: code.size + quietZone * 2 };
}
