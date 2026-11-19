import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const KEY = "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v";
/** A clinic whose register entry also has a team workspace. */
const CLINIC_KEY = "Z9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4J3i2H1g0F9e";
/** A paying organisation whose plan has ended. */
const LAPSED_KEY = "L".repeat(43);

vi.mock("@/lib/org/server", () => ({
  directory: {
    findProgrammeByReportKey: async (token: unknown) => (token === KEY || token === CLINIC_KEY ? { code: "ACMELOGI26" } : null),
    findWorkspaceByReportKey: async (token: unknown) => (token === CLINIC_KEY ? { code: "CLINICA26" } : null),
    findGroupByKey: async (token: unknown) => (token === "G".repeat(43) ? { group: { name: "North network" }, members: [] } : null),
    findLapsedByKey: async (token: unknown) => (token === LAPSED_KEY ? { name: "Lapsed Ltd" } : null)
  }
}));

import { config, proxy } from "@/proxy";

const ask = (path: string) => proxy(new NextRequest(`https://recoverly.co.in${path}`));
const passesThrough = (response: Response) => response.headers.get("x-middleware-next") === "1";

describe("proxy: a wrong organisation-report address is a real 404", () => {
  it("lets a registered key through to the page", async () => {
    expect(passesThrough(await ask(`/partners/report/${KEY}`))).toBe(true);
  });

  it("lets the public example through", async () => {
    expect(passesThrough(await ask("/partners/report/example"))).toBe(true);
  });

  it("answers 404, by rewriting to a path that does not exist, for anything else", async () => {
    for (const path of ["/partners/report/not-a-real-key-not-a-real-key", `/partners/report/${KEY}x`, "/partners/report/ACMELOGI26", "/partners/report/%E0%A4%A", "/partners/report/EXAMPLE"]) {
      const response = await ask(path);
      expect(response.status, path).toBe(404);
      expect(passesThrough(response), path).toBe(false);
      expect(response.headers.get("x-middleware-rewrite"), path).toContain("/report-key-not-found");
    }
  });

  it("does not throw on a malformed escape", async () => {
    await expect(ask("/partners/report/%")).resolves.toBeDefined();
  });

  it("only watches the report and workspace addresses", () => {
    expect(config.matcher).toEqual(["/partners/report/:token", "/partners/workspace/:token", "/partners/group/:token"]);
  });
});

describe("proxy: a team-workspace address is a real 404 unless the organisation has a workspace", () => {
  it("lets the key of an organisation that has a workspace through, and the public example", async () => {
    expect(passesThrough(await ask(`/partners/workspace/${CLINIC_KEY}`))).toBe(true);
    expect(passesThrough(await ask("/partners/workspace/example"))).toBe(true);
  });

  it("answers 404 for a report key whose organisation has no workspace, and for anything else", async () => {
    for (const path of [`/partners/workspace/${KEY}`, "/partners/workspace/not-a-real-key-not-a-real-key", `/partners/workspace/${CLINIC_KEY}x`, "/partners/workspace/CLINICA26", "/partners/workspace/%"]) {
      const response = await ask(path);
      expect(response.status, path).toBe(404);
      expect(passesThrough(response), path).toBe(false);
    }
  });

  it("does not open the report page with a workspace-only check, or the other way round", async () => {
    expect(passesThrough(await ask(`/partners/report/${CLINIC_KEY}`))).toBe(true);
    expect(passesThrough(await ask(`/partners/workspace/${KEY}`))).toBe(false);
  });
});

describe("proxy: a group roll-up address is a real 404 unless it is a group's key", () => {
  it("lets a group key through and refuses a report key or a guess", async () => {
    expect(passesThrough(await ask(`/partners/group/${"G".repeat(43)}`))).toBe(true);
    for (const path of [`/partners/group/${KEY}`, "/partners/group/not-a-real-key-not-a-real-key", "/partners/group/example"]) {
      expect((await ask(path)).status, path).toBe(path.endsWith("example") ? 200 : 404);
    }
  });
});

describe("proxy: an organisation whose plan has ended still gets its own page, which says so", () => {
  it("lets the real address of a lapsed organisation through on every kind of page, and still refuses a guess", async () => {
    for (const kind of ["report", "workspace", "group"]) {
      expect(passesThrough(await ask(`/partners/${kind}/${LAPSED_KEY}`)), kind).toBe(true);
      expect((await ask(`/partners/${kind}/${"M".repeat(43)}`)).status, kind).toBe(404);
    }
  });
});
