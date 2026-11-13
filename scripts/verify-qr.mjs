// Proves that the QR codes src/lib/qr.ts draws can be read by a scanner.
//
//   node scripts/verify-qr.mjs
//
// Needs macOS (the decoder is Core Image, via scripts/qr-decode.swift) and
// `rsvg-convert` (the same tool scripts/build-icons.py uses). Run it after ANY
// change to src/lib/qr.ts or to how a code is drawn: a poster whose code does not
// scan is worse than a poster without one, and the unit tests cannot tell.
//
// It encodes a spread of texts (one per version from 1 to 10, plus non-ASCII),
// forces each of the eight masks on a few of them, draws every code the way the
// poster does, turns it into a PNG and checks the decoder reads back the same text.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { encodeQr, qrSvgPath } from "../src/lib/qr.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "verify-qr-"));

const BASE = "https://recoverly.co.in/join/";
const cases = [
  "A",
  "0123456789",
  "https://recoverly.co.in",
  `${BASE}SAMPLE`,
  `${BASE}ABCDEFGHIJKLMNOP`,
  "नमस्ते Recoverly — आपका स्वागत है",
  "x".repeat(60),
  "The quick brown fox jumps over the lazy dog. ".repeat(2).trim() + " 1234567890",
  "y".repeat(110),
  "Recoverly ".repeat(15) + "end",
  "z".repeat(150),
  "w".repeat(213),
  // A summary link (src/lib/share.ts): an address, then the key after a #, in URL-safe base64.
  // The longest real ones are about 95 characters, so these cover what a person will actually show a clinician.
  "https://recoverly.co.in/share/mmygF3QggXRA_nMiyBcv5w#yPFBvBXqDbZWvZkI8qFiIg5KqlT6ycFEBNEwT9qj5Dk",
  "https://recoverly.co.in/share/-_-_-_-_-_-_-_-_-_-_-_#-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_"
];

const jobs = [];
for (const text of cases) jobs.push({ text, mask: undefined });
for (const text of [`${BASE}SAMPLE`, "w".repeat(150), "A", "https://recoverly.co.in/share/mmygF3QggXRA_nMiyBcv5w#yPFBvBXqDbZWvZkI8qFiIg5KqlT6ycFEBNEwT9qj5Dk"]) for (let mask = 0; mask < 8; mask++) jobs.push({ text, mask });

const files = [];
jobs.forEach((job, i) => {
  const code = encodeQr(job.text, job.mask === undefined ? {} : { mask: job.mask });
  const { d, viewBox } = qrSvgPath(code);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" width="${viewBox * 12}" height="${viewBox * 12}"><rect width="${viewBox}" height="${viewBox}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  const svgPath = join(dir, `${i}.svg`);
  const pngPath = join(dir, `${i}.png`);
  writeFileSync(svgPath, svg);
  execFileSync("rsvg-convert", ["-w", "800", "-h", "800", svgPath, "-o", pngPath]);
  files.push({ pngPath, job, version: code.version, mask: code.mask });
});

const output = execFileSync("swift", [join(here, "qr-decode.swift"), ...files.map((f) => f.pngPath)], { encoding: "utf8" })
  .trim()
  .split("\n");

let failures = 0;
files.forEach((f, i) => {
  const ok = output[i] === f.job.text;
  if (!ok) failures++;
  const shown = f.job.text.length > 28 ? `${f.job.text.slice(0, 28)}… (${f.job.text.length} chars)` : f.job.text;
  console.log(`${ok ? "ok  " : "FAIL"} v${f.version} mask ${f.mask}${f.job.mask === undefined ? " (auto)" : " (forced)"}  ${shown}${ok ? "" : `  ->  ${JSON.stringify(output[i])}`}`);
});

console.log(failures === 0 ? `\nAll ${files.length} codes were read back correctly.` : `\n${failures} of ${files.length} codes did NOT decode.`);
console.log(`Pictures are in ${dir}`);
process.exit(failures === 0 ? 0 : 1);
