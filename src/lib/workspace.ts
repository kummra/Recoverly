/**
 * The team workspace: where a person who chooses to can share their own progress, by
 * name, with the team of an organisation that supports them (a clinic or counselling
 * service above all). This hands an organisation individual-level data, so everything
 * about it is built around the person's own act and around Recoverly never being able
 * to read it:
 *
 *  - It exists only for a programme whose register entry switches it on **and** whose
 *    kind is one where a person can freely say no (`WORKSPACE_KINDS`: a clinic or a
 *    community service). It can never be switched on for a workplace or a college,
 *    where consent given to your own employer or institution is not really free; the
 *    code refuses, whatever the register says (`workspaceKeyFor` in `programme-register.ts`).
 *  - Nothing is shared by joining, by being counted or by anything else. The person reads
 *    what it means, ticks "I understand" and presses Start sharing, and can stop at any time.
 *  - What is shared is the same summary the person can make as a link (`share.ts`): only
 *    the sections they tick, never their email or account, under a name they type.
 *  - It is encrypted **on the person's device to the team's public key** (`workspace-crypto.ts`).
 *    The matching private key is made in the team's own browser and kept there, locked by a
 *    passphrase the team chooses. Recoverly stores the scrambled copies and has nothing that
 *    can open them. The public key is added to the register by the owner, after the team
 *    sends it, so that someone who got hold of the team's report link still cannot swap in a
 *    key of their own: the worst that link can do is list scrambled copies.
 *  - A copy stays readable for `WORKSPACE_LIMITS.expiryDays` after the person last sent it, so
 *    sharing carries on only while the person keeps sending (they press Update). Nothing is sent
 *    in the background.
 *  - The person can stop at any time, which deletes the copy; deleting their account deletes
 *    it too.
 *
 * Plain and safe for browsers and the server: shapes, limits and checks. See CLAUDE.md
 * "Summary links, the headcount and the team workspace" before changing any of it.
 */
import type { ProgrammeKind } from "@/lib/programme";
import { fromBase64Url } from "@/lib/share";

/** The only kinds of organisation a workspace may be switched on for. Not a workplace, not a college. */
export const WORKSPACE_KINDS: readonly ProgrammeKind[] = ["clinic", "community"];

export function workspaceAllowedFor(kind: ProgrammeKind): boolean {
  return WORKSPACE_KINDS.includes(kind);
}

export const WORKSPACE_LIMITS = {
  /** Same cap as a summary link: a real summary is a few kilobytes. */
  ciphertextMaxChars: 24_000,
  ciphertextMinChars: 22,
  /** An RSA-2048 wrapped key is 256 bytes, 342 characters. */
  wrappedKeyChars: 342,
  /** How long a shared copy stays readable after the person last sent it. The policy says this too. */
  expiryDays: 30,
  /** Programmes a person can have a live copy with at once (they are in one at a time; this is a ceiling). */
  perPersonMax: 3,
  /** The most copies one team's inbox returns. */
  inboxMax: 300,
  /** Letters and digits of a key's fingerprint. */
  keyIdChars: 20
} as const;

/** A programme's workspace as the server sees it (built from the register; never sent to a browser whole). */
export type WorkspaceTeam = {
  code: string;
  name: string;
  /** The sample programme: it accepts a copy and stores nothing, so the flow can be tried. */
  practice: boolean;
  /** The team's public key, once the owner has added it to the register. Until then nobody can share. */
  publicKey: JsonWebKey | null;
  /** That key's fingerprint (`keyIdOf` here in the browser, `workspaceKeyId` on the server: the same text). */
  keyId: string | null;
};

export const WORKSPACE_EXPIRY_MS = WORKSPACE_LIMITS.expiryDays * 24 * 60 * 60 * 1000;

const B64URL = /^[A-Za-z0-9_-]+$/;

/** The nonce for the summary's encryption: 12 bytes, 16 characters. */
export function isWorkspaceIv(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16}$/.test(value);
}

export function isWorkspaceCiphertext(value: unknown): value is string {
  return typeof value === "string" && value.length >= WORKSPACE_LIMITS.ciphertextMinChars && value.length <= WORKSPACE_LIMITS.ciphertextMaxChars && B64URL.test(value);
}

/** The summary's key, wrapped with the team's public key: exactly 256 bytes for RSA-2048. */
export function isWrappedKey(value: unknown): value is string {
  return typeof value === "string" && value.length === WORKSPACE_LIMITS.wrappedKeyChars && B64URL.test(value) && fromBase64Url(value)?.length === 256;
}

/** A key's fingerprint as stored and sent: lower-case hex. */
export function isKeyId(value: unknown): value is string {
  return typeof value === "string" && new RegExp(`^[0-9a-f]{${WORKSPACE_LIMITS.keyIdChars}}$`).test(value);
}

/** The fingerprint as a person reads it aloud or compares it: groups of four, upper-case. */
export function formatKeyId(keyId: string): string {
  return keyId.toUpperCase().replace(/(.{4})(?=.)/g, "$1 ");
}

/** The private half of an RSA key. Nothing in a public key may carry one of these. */
const PRIVATE_FIELDS = ["d", "p", "q", "dp", "dq", "qi", "oth", "k"];

/**
 * A team's public key as a JSON Web Key, rebuilt from only its public fields, or `null`.
 * Anything with a private field is refused outright (pasting the wrong file into the register
 * would publish the key that opens everything), as is anything that is not RSA-OAEP-256 of a
 * sensible size.
 */
export function cleanPublicKey(input: unknown): JsonWebKey | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  if (PRIVATE_FIELDS.some((field) => field in raw)) return null;
  if (raw.kty !== "RSA" || typeof raw.n !== "string" || typeof raw.e !== "string") return null;
  if (raw.alg !== undefined && raw.alg !== "RSA-OAEP-256") return null;
  // 2048 bits is 256 bytes; allow up to 4096 for a team that wants more. Never less.
  const modulus = fromBase64Url(raw.n);
  if (!modulus || modulus.length < 256 || modulus.length > 512) return null;
  if (!B64URL.test(raw.e) || raw.e.length > 8) return null;
  return { kty: "RSA", alg: "RSA-OAEP-256", e: raw.e, n: raw.n, ext: true, key_ops: ["encrypt"] };
}

/** The same key as one stable piece of text, the same whatever order or extra fields it arrived with. */
export function publicKeyText(jwk: JsonWebKey): string {
  return JSON.stringify({ alg: jwk.alg, e: jwk.e, ext: true, key_ops: ["encrypt"], kty: jwk.kty, n: jwk.n });
}
