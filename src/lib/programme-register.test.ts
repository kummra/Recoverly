import { beforeAll, describe, expect, it } from "vitest";

import {
  PROGRAMMES,
  type RegisterEntry,
  findProgramme,
  findProgrammeByReportKey,
  findWorkspaceByReportKey,
  findWorkspaceTeam,
  hashReportKey,
  matchReportKey,
  publicProgramme,
  workspaceKeyId,
  workspaceTeamFor
} from "@/lib/programme-register";
import { cleanPublicKey, workspaceAllowedFor } from "@/lib/workspace";
import { generateWorkspaceKeys } from "@/lib/workspace-crypto";

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

describe("figures", () => {
  it("are offered to people only for an organisation that has a report key, and the sample shows them so they can be tried", () => {
    const base = entry("ACMELOGI26", TOKEN);
    expect(publicProgramme({ ...base, figures: true })).toMatchObject({ headcount: true, figures: true });
    expect(publicProgramme(base).figures).toBeUndefined();
    // Without a report key they are not offered, whatever else is set.
    expect(publicProgramme({ ...entry("QUIETORG26"), figures: true })).not.toHaveProperty("figures");
    expect(publicProgramme({ ...entry("SAMPLE"), kind: "sample" })).toMatchObject({ headcount: true, figures: true });
  });
});

describe("the team workspace", () => {
  let KEY: JsonWebKey;
  let PRIVATE: JsonWebKey;
  beforeAll(async () => {
    const pair = await generateWorkspaceKeys();
    KEY = pair.publicJwk;
    PRIVATE = pair.privateJwk;
  });

  const clinic = (workspace?: RegisterEntry["workspace"], withReportKey = true): RegisterEntry => ({
    ...entry("CLINICA26", withReportKey ? TOKEN : undefined),
    kind: "clinic",
    ...(workspace ? { workspace } : {})
  });

  it("is offered to people only once the team's public key is in the register, for a clinic or community service with a report key", () => {
    expect(publicProgramme(clinic({ publicKey: KEY })).workspace).toBe(true);
    expect(publicProgramme({ ...clinic({ publicKey: KEY }), kind: "community" }).workspace).toBe(true);
    // Switched on but the team has not sent its key yet: nobody is offered anything.
    expect(publicProgramme(clinic({})).workspace).toBeUndefined();
    expect(publicProgramme(clinic()).workspace).toBeUndefined();
  });

  it("can never be offered by a workplace or a college, whatever the register says, because they cannot freely say no there", () => {
    for (const kind of ["workplace", "college"] as const) {
      const risky: RegisterEntry = { ...clinic({ publicKey: KEY }), kind };
      expect(workspaceAllowedFor(kind)).toBe(false);
      expect(publicProgramme(risky).workspace, kind).toBeUndefined();
      expect(workspaceTeamFor(risky), kind).toBeNull();
    }
  });

  it("is never offered without a report key, and never with a key that has any part of a private key in it", () => {
    expect(publicProgramme(clinic({ publicKey: KEY }, false)).workspace).toBeUndefined();
    expect(publicProgramme(clinic({ publicKey: PRIVATE })).workspace).toBeUndefined();
    expect(publicProgramme(clinic({ publicKey: { ...KEY, d: "AAAA" } })).workspace).toBeUndefined();
    expect(publicProgramme(clinic({ publicKey: { kty: "EC" } })).workspace).toBeUndefined();
  });

  it("is a practice workspace for the sample, which has no key and stores nothing", () => {
    const sample: RegisterEntry = { ...entry("SAMPLE"), kind: "sample" };
    expect(publicProgramme(sample).workspace).toBe(true);
    expect(workspaceTeamFor(sample)).toEqual({ code: "SAMPLE", name: "Org SAMPLE", practice: true, publicKey: null, keyId: null });
    expect(findWorkspaceTeam("sample")).toMatchObject({ practice: true });
  });

  it("gives a team its key and fingerprint, or nothing yet if it has not sent one, or nothing at all if it has no workspace", () => {
    const live = workspaceTeamFor(clinic({ publicKey: KEY }));
    expect(live).toMatchObject({ code: "CLINICA26", practice: false });
    expect(live?.publicKey).toEqual(cleanPublicKey(KEY));
    expect(live?.keyId).toBe(workspaceKeyId(KEY));
    expect(workspaceTeamFor(clinic({}))).toMatchObject({ practice: false, publicKey: null, keyId: null });
    expect(workspaceTeamFor(clinic())).toBeNull();
  });

  it("is looked up from a team's private link only for a real workspace, and never from a code a person typed unless it can be used", () => {
    // The real register has no workspace yet: nothing is offered for any code, and no link opens one.
    expect(findWorkspaceTeam("NOTACODE")).toBeNull();
    expect(findWorkspaceTeam(null)).toBeNull();
    expect(findWorkspaceByReportKey(TOKEN)).toBeNull();
    expect(findWorkspaceByReportKey("x".repeat(43))).toBeNull();
    expect(findWorkspaceByReportKey(undefined)).toBeNull();
  });

  it("has a fingerprint that tells keys apart and does not change with the key's field order", async () => {
    const other = (await generateWorkspaceKeys()).publicJwk;
    expect(workspaceKeyId(KEY)).toMatch(/^[0-9a-f]{20}$/);
    expect(workspaceKeyId(KEY)).not.toBe(workspaceKeyId(other));
    expect(workspaceKeyId({ n: KEY.n, e: KEY.e, kty: "RSA", alg: "RSA-OAEP-256", ext: true, key_ops: ["encrypt"] })).toBe(workspaceKeyId(KEY));
  });

  it("is set only on real entries that have a report key and a kind where a person can freely say no, with a clean public key", () => {
    for (const real of PROGRAMMES) {
      if (!real.workspace) continue;
      expect(real.report, `${real.code} needs a report key`).toBeDefined();
      expect(workspaceAllowedFor(real.kind), `${real.code} is a ${real.kind}: a workspace is for a clinic or community service only`).toBe(true);
      if (real.workspace.publicKey !== undefined) expect(cleanPublicKey(real.workspace.publicKey), `${real.code}: the key must be a public RSA key with nothing private in it`).not.toBeNull();
    }
  });
});

describe("hashReportKey", () => {
  it("is the SHA-256 of the key, in hex, so what scripts/make-report-key.mjs prints matches what the register checks", () => {
    expect(hashReportKey("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
