import { describe, expect, it } from "vitest";

import { isOwner, ownerUids } from "@/lib/org/owner";
import { SESSION_TTL_MS, sessionSecret, signSession, verifySession } from "@/lib/org/session";

const SECRET = "s".repeat(40);
const NOW = 1_800_000_000_000;

describe("the members' cookie", () => {
  it("is made and read back only with the same secret, and says whose it is", () => {
    const value = signSession("uid-1", SECRET, NOW);
    expect(verifySession(value, SECRET, NOW + 1000)).toBe("uid-1");
    expect(verifySession(value, "t".repeat(40), NOW + 1000)).toBeNull();
  });

  it("ends by itself", () => {
    const value = signSession("uid-1", SECRET, NOW);
    expect(verifySession(value, SECRET, NOW + SESSION_TTL_MS - 1)).toBe("uid-1");
    expect(verifySession(value, SECRET, NOW + SESSION_TTL_MS)).toBeNull();
  });

  it("refuses anything changed, forged, missing or malformed", () => {
    const value = signSession("uid-1", SECRET, NOW);
    const [payload, signature] = value.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "uid-2", e: NOW + SESSION_TTL_MS })).toString("base64url");
    for (const bad of [`${forged}.${signature}`, `${payload}.${signature.slice(0, -2)}AA`, `${payload}.`, `.${signature}`, payload, `${value}.extra`, "", "garbage", "a.b", "x".repeat(500)]) {
      expect(verifySession(bad, SECRET, NOW), bad.slice(0, 30)).toBeNull();
    }
    expect(verifySession(null, SECRET, NOW)).toBeNull();
    expect(verifySession(undefined, SECRET, NOW)).toBeNull();
  });

  it("is never made or read without a secret of at least 32 characters, so the paywall fails closed", () => {
    expect(sessionSecret({ SESSION_SECRET: "s".repeat(32) })).toBe("s".repeat(32));
    for (const weak of [undefined, "", "short", "s".repeat(31)]) expect(sessionSecret({ SESSION_SECRET: weak })).toBeNull();
    expect(verifySession(signSession("uid-1", SECRET, NOW), null, NOW)).toBeNull();
  });
});

describe("the owner list", () => {
  it("is exactly the ids in OWNER_UIDS, and nobody when it is unset", () => {
    expect(ownerUids({ OWNER_UIDS: " a , b,,c " })).toEqual(["a", "b", "c"]);
    expect(isOwner("b", { OWNER_UIDS: "a,b" })).toBe(true);
    expect(isOwner("ab", { OWNER_UIDS: "a,b" })).toBe(false);
    for (const env of [{}, { OWNER_UIDS: "" }, { OWNER_UIDS: " , " }]) expect(isOwner("a", env)).toBe(false);
    expect(isOwner(null, { OWNER_UIDS: "a" })).toBe(false);
    expect(isOwner("", { OWNER_UIDS: "a" })).toBe(false);
  });
});
