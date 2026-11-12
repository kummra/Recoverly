import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "@/app/embed/help/route";
import { EMBED_CSP } from "@/lib/helplines-embed";
import { LIMITS } from "@/lib/rate-limit";

let counter = 0;
function get(query = "", ip = `10.2.0.${(counter += 1)}`) {
  return GET(new NextRequest(`https://recoverly.co.in/embed/help${query}`, { headers: { "x-forwarded-for": ip } }));
}

describe("GET /embed/help", () => {
  it("is an HTML page that other sites are allowed to frame, and that can do nothing else", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("content-security-policy")).toBe(EMBED_CSP);
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(res.headers.get("set-cookie")).toBeNull();
    const html = await res.text();
    expect(html).toContain("tel:14416");
    expect(html).toContain("tel:112");
  });

  it("follows ?lang= and ?theme=, and ignores anything it does not know", async () => {
    const hindi = await (await get("?lang=hi&theme=dark")).text();
    expect(hindi).toContain('lang="hi"');
    expect(hindi).toContain('class="dark"');
    const fallback = await (await get('?lang="><script>&theme=<b>')).text();
    expect(fallback).toContain('lang="en"');
    expect(fallback).toContain('class="light"');
    expect(fallback).not.toContain("<script");
  });

  it("has a ceiling per caller", async () => {
    const ip = "198.51.100.210";
    for (let i = 0; i < LIMITS.helplines.limit; i++) expect((await get("", ip)).status).toBe(200);
    expect((await get("", ip)).status).toBe(429);
  });
});
