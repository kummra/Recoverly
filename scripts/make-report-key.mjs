#!/usr/bin/env node
/**
 * Makes the private report link for an organisation that receives the anonymous
 * monthly headcount (see src/lib/programme-register.ts and src/lib/programme-count.ts).
 *
 *   node scripts/make-report-key.mjs
 *
 * It prints two things:
 *   1. the link to send to the organisation. It is a secret: whoever has it can read
 *      that organisation's monthly figures (and nothing else). It is NOT written to any
 *      file here, so copy it now;
 *   2. the line to paste into that organisation's entry in the register. It holds only a
 *      SHA-256 hash of the key, so the repository never contains a working link.
 */
import { createHash, randomBytes } from "node:crypto";

const token = randomBytes(32).toString("base64url");
const keyHash = createHash("sha256").update(token).digest("hex");

console.log(`
Send this link to the organisation (keep it private; it is shown only now):

  https://recoverly.co.in/partners/report/${token}

Paste this line into their entry in src/lib/programme-register.ts, then push:

  report: { keyHash: "${keyHash}" },
`);
