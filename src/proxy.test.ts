import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const KEY = "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v";

vi.mock("@/lib/programme-register", () => ({
  findProgrammeByReportKey: (token: unknown) => (token === KEY ? { code: "ACMELOGI26" } : null)
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

  it("only watches the report addresses", () => {
    expect(config.matcher).toBe("/partners/report/:token");
  });
});
