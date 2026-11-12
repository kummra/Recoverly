import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET, OPTIONS } from "@/app/api/helplines/route";
import { LIMITS } from "@/lib/rate-limit";
import { HELPLINES } from "@/lib/safety";

let counter = 0;
function get(query = "", ip = `10.1.0.${(counter += 1)}`) {
  return GET(new NextRequest(`https://recoverly.co.in/api/helplines${query}`, { headers: { "x-forwarded-for": ip } }));
}

describe("GET /api/helplines", () => {
  it("answers with the national helplines, readable from any site", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.json();
    expect(body.country).toBe("IN");
    expect(body.helplines.map((h: { number: string }) => h.number)).toEqual([HELPLINES.india.teleManas, HELPLINES.india.emergency]);
  });

  it("follows ?lang= and falls back to English", async () => {
    expect((await (await get("?lang=hi")).json()).language).toBe("hi");
    expect((await (await get("?lang=klingon")).json()).language).toBe("en");
  });

  it("sets no cookie and asks nothing about the caller", async () => {
    const res = await get("", "203.0.113.50");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(JSON.stringify(await res.json())).not.toContain("203.0.113.50");
  });

  it("answers a browser's preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("has a ceiling per caller", async () => {
    const ip = "198.51.100.200";
    for (let i = 0; i < LIMITS.helplines.limit; i++) expect((await get("", ip)).status).toBe(200);
    expect((await get("", ip)).status).toBe(429);
    expect((await get("", "198.51.100.201")).status).toBe(200);
  });
});
