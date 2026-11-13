import { describe, expect, it } from "vitest";

import { PROGRAMMES, type RegisterEntry, findProgramme, findProgrammeByReportKey, hashReportKey, matchReportKey, publicProgramme } from "@/lib/programme-register";

const TOKEN = "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v";
const OTHER = "Z9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4J3i2H1g0F9e";

const entry = (code: string, token?: string): RegisterEntry => ({
  code,
  name: `Org ${code}`,
  kind: "workplace",
  welcome: { en: "Welcome, everyone." },
  contacts: [],
  ...(token ? { report: { keyHash: hashReportKey(token) } } : {})
});

describe("what a person is shown about a register entry", () => {
  it("offers the headcount only for an organisation that has agreed to it, and for the sample", () => {
    expect(publicProgramme(entry("ACMELOGI26")).headcount).toBeUndefined();
    expect(publicProgramme(entry("ACMELOGI26", TOKEN)).headcount).toBe(true);
    expect(publicProgramme({ ...entry("SAMPLE"), kind: "sample" }).headcount).toBe(true);
  });

  it("never lets the report key, or its hash, reach a browser", () => {
    const shown = JSON.stringify(publicProgramme(entry("ACMELOGI26", TOKEN)));
    expect(shown).not.toContain(hashReportKey(TOKEN));
    expect(shown).not.toMatch(/report|keyHash/i);
  });

  it("is what the lookup gives for the sample", () => {
    expect(findProgramme("SAMPLE")).toEqual(publicProgramme(PROGRAMMES.find((p) => p.code === "SAMPLE")!));
    expect(findProgramme("SAMPLE")?.headcount).toBe(true);
  });
});

describe("finding an organisation by its private report key", () => {
  const entries = [entry("ACMELOGI26", TOKEN), entry("QUIETORG26"), entry("OTHERORG26", OTHER)];

  it("finds the one whose key it is", () => {
    expect(matchReportKey(entries, TOKEN)?.code).toBe("ACMELOGI26");
    expect(matchReportKey(entries, OTHER)?.code).toBe("OTHERORG26");
  });

  it("finds nothing for a key it does not hold, or one that is not a key", () => {
    for (const bad of ["x".repeat(43), "", "short", `${TOKEN}x`, `${TOKEN.slice(0, -1)}`, "x".repeat(200), null, undefined, 5, {}]) {
      expect(matchReportKey(entries, bad), String(bad)).toBeNull();
    }
  });

  it("does not take a programme's code, or the stored hash, for a key", () => {
    expect(matchReportKey(entries, "ACMELOGI26")).toBeNull();
    expect(matchReportKey(entries, hashReportKey(TOKEN))).toBeNull();
  });

  it("ignores an entry whose stored hash is malformed, rather than throwing", () => {
    const broken: RegisterEntry[] = [{ ...entry("BROKENORG26"), report: { keyHash: "not-hex" } }, entry("ACMELOGI26", TOKEN)];
    expect(matchReportKey(broken, TOKEN)?.code).toBe("ACMELOGI26");
    expect(matchReportKey(broken, "y".repeat(43))).toBeNull();
  });

  it("holds no real key in the repository: only the real register's hashes, and none matches a guess", () => {
    expect(findProgrammeByReportKey(TOKEN)).toBeNull();
    for (const real of PROGRAMMES) if (real.report) expect(real.report.keyHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("the real register's report keys", () => {
  it("are well-formed, unique, and never on the sample", () => {
    const hashes = PROGRAMMES.filter((p) => p.report).map((p) => p.report!.keyHash);
    for (const hash of hashes) expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(hashes).size).toBe(hashes.length);
    expect(PROGRAMMES.find((p) => p.kind === "sample")?.report).toBeUndefined();
  });
});

describe("hashReportKey", () => {
  it("is the SHA-256 of the key, in hex, so what scripts/make-report-key.mjs prints matches what the register checks", () => {
    expect(hashReportKey("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
