import { describe, expect, it } from "vitest";

import { MAX_ORG_NAME, cleanOrgName, joinUrl, parsePosterSettings, posterHref, shortUrl } from "@/lib/toolkit";

describe("cleanOrgName", () => {
  it("keeps a name on one line and cuts it to length", () => {
    expect(cleanOrgName("  Acme   Logistics\n Pvt. Ltd. ")).toBe("Acme Logistics Pvt. Ltd.");
    expect(cleanOrgName("x".repeat(200))).toHaveLength(MAX_ORG_NAME);
    expect(cleanOrgName("A\u0007B")).toBe("A B");
  });

  it("is empty for anything that is not text", () => {
    for (const bad of [undefined, null, 5, {}, []]) expect(cleanOrgName(bad as never)).toBe("");
  });
});

describe("joinUrl and shortUrl", () => {
  it("points a code at its join page and no code at the home page", () => {
    expect(joinUrl("ACMELOGI26")).toBe("https://recoverly.co.in/join/ACMELOGI26");
    expect(joinUrl(null)).toBe("https://recoverly.co.in");
  });

  it("prints the address without the scheme", () => {
    expect(shortUrl("https://recoverly.co.in/join/SAMPLE")).toBe("recoverly.co.in/join/SAMPLE");
  });
});

describe("parsePosterSettings", () => {
  it("falls back to the plain English poster", () => {
    expect(parsePosterSettings({})).toEqual({ org: "", code: null, locale: "en", format: "poster" });
  });

  it("reads each setting, cleaned", () => {
    expect(parsePosterSettings({ org: "  Acme  ", code: "acme-logi 26", lang: "hi", format: "cards" })).toEqual({
      org: "Acme",
      code: "ACMELOGI26",
      locale: "hi",
      format: "cards"
    });
  });

  it("ignores what it does not understand", () => {
    expect(parsePosterSettings({ code: "<script>", lang: "fr", format: "mural" })).toEqual({ org: "", code: null, locale: "en", format: "poster" });
  });

  it("takes the first value when a setting is repeated", () => {
    expect(parsePosterSettings({ lang: ["ta", "hi"], org: ["One", "Two"] })).toMatchObject({ locale: "ta", org: "One" });
  });
});

describe("posterHref", () => {
  it("leaves out the defaults", () => {
    expect(posterHref({ org: "", code: null, locale: "en", format: "poster" })).toBe("/partners/toolkit/poster");
  });

  it("round-trips through parsePosterSettings", () => {
    const settings = { org: "Acme & Sons, Mumbai", code: "ACMELOGI26", locale: "ta" as const, format: "cards" as const };
    const href = posterHref(settings);
    const query = Object.fromEntries(new URL(href, "https://recoverly.co.in").searchParams);
    expect(parsePosterSettings(query)).toEqual(settings);
  });
});
