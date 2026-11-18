import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const KEY = "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v";
/** A clinic whose register entry also has a team workspace. */
const CLINIC_KEY = "Z9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4J3i2H1g0F9e";

vi.mock("@/lib/programme-register", () => ({
  findProgrammeByReportKey: (token: unknown) => (token === KEY || token === CLINIC_KEY ? { code: "ACMELOGI26" } : null),
  findWorkspaceByReportKey: (token: unknown) => (token === CLINIC_KEY ? { code: "CLINICA26" } : null),
  findGroupByKey: (token: unknown) => (token === "G".repeat(43) ? { group: { name: "North network" }, members: [] } : null)
}));

import { config, proxy } from "@/proxy";

const ask = (path: string) => proxy(new NextRequest(`https://recoverly.co.in${path}`));
const passesThrough = (response: Response) => response.headers.get("x-middleware-next") === "1";

describe("proxy: a wrong organisation-report address is a real 404", () => {
  it("lets a registered key through to the page", () => {
    expect(passesThrough(ask(`/partners/report/${KEY}`))).toBe(true);
  });

  it("lets the public example through", () => {
    expect(passesThrough(ask("/partners/report/example"))).toBe(true);
  });

  it("answers 404, by rewriting to a path that does not exist, for anything else", () => {
    for (const path of ["/partners/report/not-a-real-key-not-a-real-key", `/partners/report/${KEY}x`, "/partners/report/ACMELOGI26", "/partners/report/%E0%A4%A", "/partners/report/EXAMPLE"]) {
      const response = ask(path);
      expect(response.status, path).toBe(404);
      expect(passesThrough(response), path).toBe(false);
      expect(response.headers.get("x-middleware-rewrite"), path).toContain("/report-key-not-found");
    }
  });

  it("does not throw on a malformed escape", () => {
    expect(() => ask("/partners/report/%")).not.toThrow();
  });

  it("only watches the report and workspace addresses", () => {
    expect(config.matcher).toEqual(["/partners/report/:token", "/partners/workspace/:token", "/partners/group/:token"]);
  });
});

describe("proxy: a team-workspace address is a real 404 unless the organisation has a workspace", () => {
  it("lets the key of an organisation that has a workspace through, and the public example", () => {
    expect(passesThrough(ask(`/partners/workspace/${CLINIC_KEY}`))).toBe(true);
    expect(passesThrough(ask("/partners/workspace/example"))).toBe(true);
  });

  it("answers 404 for a report key whose organisation has no workspace, and for anything else", () => {
    for (const path of [`/partners/workspace/${KEY}`, "/partners/workspace/not-a-real-key-not-a-real-key", `/partners/workspace/${CLINIC_KEY}x`, "/partners/workspace/CLINICA26", "/partners/workspace/%"]) {
      const response = ask(path);
      expect(response.status, path).toBe(404);
      expect(passesThrough(response), path).toBe(false);
    }
  });

  it("does not open the report page with a workspace-only check, or the other way round", () => {
    expect(passesThrough(ask(`/partners/report/${CLINIC_KEY}`))).toBe(true);
    expect(passesThrough(ask(`/partners/workspace/${KEY}`))).toBe(false);
  });
});

describe("proxy: a group roll-up address is a real 404 unless it is a group's key", () => {
  it("lets a group key through and refuses a report key or a guess", () => {
    expect(passesThrough(ask(`/partners/group/${"G".repeat(43)}`))).toBe(true);
    for (const path of [`/partners/group/${KEY}`, "/partners/group/not-a-real-key-not-a-real-key", "/partners/group/example"]) {
      expect(ask(path).status, path).toBe(path.endsWith("example") ? 200 : 404);
    }
  });
});
