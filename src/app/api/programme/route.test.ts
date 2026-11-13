import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/programme/route";
import { PROGRAMMES, publicProgramme } from "@/lib/programme-register";
import { LIMITS } from "@/lib/rate-limit";

let counter = 0;
/** A distinct caller each time, so the in-memory rate limit does not carry over. */
function get(query: string, ip = `10.0.0.${(counter += 1)}`) {
  return GET(new NextRequest(`https://recoverly.co.in/api/programme${query}`, { headers: { "x-forwarded-for": ip } }));
}

describe("GET /api/programme", () => {
  it("answers a known code with the programme, and only that one", async () => {
    const response = await get("?code=SAMPLE");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ programme: publicProgramme(PROGRAMMES.find((p) => p.code === "SAMPLE")!) });
    // A browser may learn that the headcount choice is on offer, and nothing about how a report is read.
    expect(body.programme.headcount).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/report|keyHash/i);
  });

  it("accepts the code however it was typed", async () => {
    for (const typed of ["sample", "Sa-Mp-Le", "%20SAMPLE%20"]) {
      const response = await get(`?code=${typed}`);
      expect(response.status, typed).toBe(200);
    }
  });

  it("says 404 for a code it does not hold", async () => {
    const response = await get("?code=NOSUCHCODE");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not-found" });
  });

  it("says 400 for something that cannot be a code", async () => {
    for (const query of ["", "?code=", "?code=ab", "?code=<script>alert(1)</script>", `?code=${"A".repeat(200)}`]) {
      expect((await get(query)).status, query).toBe(400);
    }
  });

  it("never lists, and never reveals another programme", async () => {
    // A partial code, a wildcard and an empty search must not return anything.
    for (const query of ["?code=SAM", "?code=SAMPLE*", "?code=*", "?all=1", "?code=SAMPL"]) {
      expect((await get(query)).status, query).not.toBe(200);
    }
  });

  it("sets no cookie and keeps nothing about the caller in what it sends", async () => {
    const response = await get("?code=SAMPLE", "203.0.113.9");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(JSON.stringify(await response.json())).not.toContain("203.0.113.9");
  });

  it("is generous to one shared connection and still has a ceiling", async () => {
    const ip = "198.51.100.77";
    // A whole office on one address, in one hour.
    for (let i = 0; i < LIMITS.programme.limit; i++) expect((await get("?code=SAMPLE", ip)).status).toBe(200);
    const refused = await get("?code=SAMPLE", ip);
    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toBeTruthy();
    // Someone else is not affected.
    expect((await get("?code=SAMPLE", "198.51.100.78")).status).toBe(200);
  });
});
