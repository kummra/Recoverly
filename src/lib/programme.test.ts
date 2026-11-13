import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  type Programme,
  cleanContactPhone,
  cleanHttpsUrl,
  normaliseCode,
  sanitiseProgramme,
  validateProgramme,
  welcomeFor
} from "@/lib/programme";
import { PROGRAMMES, findProgramme, publicProgramme } from "@/lib/programme-register";

const GOOD: Programme = {
  code: "ACMELOGI26",
  name: "Acme Logistics",
  kind: "workplace",
  welcome: { en: "Welcome. Our people matter to us, and so does their health.", hi: "स्वागत है।" },
  contacts: [
    { label: "Employee assistance line", phone: "18005550123", hours: "Mon to Sat, 9 am to 6 pm" },
    { label: "People team", email: "people@acme.example" },
    { label: "Wellbeing page", url: "https://acme.example/wellbeing" }
  ],
  locale: "hi"
};

describe("normaliseCode", () => {
  it("accepts a code however it was typed", () => {
    expect(normaliseCode("acmelogi26")).toBe("ACMELOGI26");
    expect(normaliseCode(" ACME-LOGI 26 ")).toBe("ACMELOGI26");
    expect(normaliseCode("acme_logi.26")).toBe("ACMELOGI26");
  });

  it("refuses what cannot be a code", () => {
    for (const bad of ["", "abc", "A".repeat(17), "ACME/LOGI", "ACME<script>", "ACMÉLOGI", "नमस्ते1234", null, undefined, 123456, {}, "A".repeat(500)]) {
      expect(normaliseCode(bad as never), String(bad)).toBeNull();
    }
  });
});

describe("cleanContactPhone", () => {
  it("keeps what a phone can dial, including short codes", () => {
    expect(cleanContactPhone("14416")).toBe("14416");
    expect(cleanContactPhone("1-800-891-4416")).toBe("18008914416");
    expect(cleanContactPhone("+91 98765 43210")).toBe("+919876543210");
    expect(cleanContactPhone("112")).toBe("112");
  });

  it("refuses what cannot be dialled", () => {
    for (const bad of ["", "12", "abc", "98a7654321", "1234567890123456", "++9198765", "tel:112", null, 112]) {
      expect(cleanContactPhone(bad as never), String(bad)).toBeNull();
    }
  });
});

describe("cleanHttpsUrl", () => {
  it("allows a plain https address", () => {
    expect(cleanHttpsUrl("https://acme.example/wellbeing")).toBe("https://acme.example/wellbeing");
    expect(cleanHttpsUrl("https://acme.example")).toBe("https://acme.example/");
  });

  it("refuses anything a browser should not be sent to", () => {
    for (const bad of [
      "http://acme.example",
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<b>x</b>",
      "https://user:secret@acme.example",
      "//acme.example",
      "acme.example",
      "https://",
      `https://acme.example/${"a".repeat(300)}`,
      "",
      null
    ]) {
      expect(cleanHttpsUrl(bad as never), String(bad)).toBeNull();
    }
  });
});

describe("sanitiseProgramme", () => {
  it("keeps a good programme as it is", () => {
    expect(sanitiseProgramme(GOOD)).toEqual(GOOD);
  });

  it("survives a trip through JSON, which is how it is stored and sent", () => {
    expect(sanitiseProgramme(JSON.parse(JSON.stringify(GOOD)))).toEqual(GOOD);
  });

  it("returns null when it is not a usable programme", () => {
    for (const bad of [null, undefined, "x", 3, [], {}, { ...GOOD, code: "no" }, { ...GOOD, name: "   " }, { ...GOOD, kind: "casino" }, { ...GOOD, welcome: { hi: "स्वागत है।" } }, { ...GOOD, welcome: null }]) {
      expect(sanitiseProgramme(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("drops fields it does not know, so stored data cannot smuggle anything in", () => {
    const result = sanitiseProgramme({ ...GOOD, isAdmin: true, onclick: "x()", contacts: [{ label: "Line", phone: "112", evil: "1" }] });
    expect(result).not.toHaveProperty("isAdmin");
    expect(result).not.toHaveProperty("onclick");
    expect(result?.contacts[0]).toEqual({ label: "Line", phone: "112" });
  });

  it("never lets a link become a script", () => {
    const result = sanitiseProgramme({
      ...GOOD,
      contacts: [
        { label: "Bad", url: "javascript:alert(1)" },
        { label: "Mixed", url: "javascript:alert(1)", phone: "112" },
        { label: "Plain http", url: "http://acme.example" },
        { label: "Good", url: "https://acme.example/x" }
      ]
    });
    // A contact with nothing reachable is dropped; one that has a number keeps only that.
    expect(result?.contacts).toEqual([
      { label: "Mixed", phone: "112" },
      { label: "Good", url: "https://acme.example/x" }
    ]);
  });

  it("limits length, number of contacts and unknown languages", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ label: `Line ${i}`, phone: "112" }));
    const result = sanitiseProgramme({
      ...GOOD,
      name: "N".repeat(500),
      welcome: { en: "W".repeat(2000), xx: "ignored" },
      contacts: many,
      locale: "klingon"
    });
    expect(result?.name).toHaveLength(80);
    expect(result?.welcome.en).toHaveLength(400);
    expect(result?.welcome).not.toHaveProperty("xx");
    expect(result?.contacts).toHaveLength(4);
    expect(result?.locale).toBeUndefined();
  });

  it("flattens line breaks and control characters in text", () => {
    expect(sanitiseProgramme({ ...GOOD, name: "Acme\n\tLogistics\u0007" })?.name).toBe("Acme Logistics");
  });

  it("normalises the code, so a lower-case stored code still works", () => {
    expect(sanitiseProgramme({ ...GOOD, code: "acme logi26" })?.code).toBe("ACMELOGI26");
  });
});

describe("welcomeFor", () => {
  it("uses the language asked for, and English where the organisation wrote none", () => {
    expect(welcomeFor(GOOD, "hi")).toBe("स्वागत है।");
    expect(welcomeFor(GOOD, "ta")).toBe(GOOD.welcome.en);
  });
});

describe("validateProgramme", () => {
  it("passes a good programme", () => {
    expect(validateProgramme(GOOD)).toEqual([]);
  });

  it("names each problem a new entry could have", () => {
    const problems = (changes: Partial<Programme>) => validateProgramme({ ...GOOD, ...changes });
    expect(problems({ code: "acme" }).join()).toMatch(/upper-case/);
    expect(problems({ code: "ACME1" }).join()).toMatch(/at least 6/);
    expect(problems({ name: "A" }).join()).toMatch(/name/);
    expect(problems({ welcome: { en: "short" } }).join()).toMatch(/too short/);
    expect(problems({ locale: "xx" as never }).join()).toMatch(/locale/);
    expect(problems({ contacts: [{ label: "Nothing" }] }).join()).toMatch(/no phone, email or link/);
    expect(problems({ contacts: [{ label: "Line", phone: "98 765" }] }).join()).toMatch(/phone/);
    expect(problems({ contacts: [{ label: "Line", email: "not an email" }] }).join()).toMatch(/email/);
    expect(problems({ contacts: [{ label: "Line", url: "http://acme.example/" }] }).join()).toMatch(/https/);
    expect(problems({ contacts: [{ label: "Line", url: "https://acme.example" }] }).join()).toMatch(/https/); // needs the trailing slash a browser writes
    expect(problems({ contacts: Array.from({ length: 5 }, (_, i) => ({ label: `L${i}`, phone: "112" })) }).join()).toMatch(/at most 4/);
  });

  it("keeps SAMPLE for the sample programme", () => {
    expect(validateProgramme({ ...GOOD, code: "SAMPLE" }).join()).toMatch(/reserved/);
    expect(validateProgramme({ ...GOOD, kind: "sample" }).join()).toMatch(/only the SAMPLE/);
  });
});

describe("the register", () => {
  it("has only well-formed programmes", () => {
    for (const programme of PROGRAMMES) expect(validateProgramme(programme), programme.code).toEqual([]);
  });

  it("has unique codes", () => {
    const codes = PROGRAMMES.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("survives sanitising unchanged, so what is shown is what was written", () => {
    for (const entry of PROGRAMMES) {
      const shown = publicProgramme(entry);
      expect(sanitiseProgramme(JSON.parse(JSON.stringify(shown))), entry.code).toEqual(shown);
    }
  });

  it("has exactly one sample, and it is the only one that says so", () => {
    expect(PROGRAMMES.filter((p) => p.kind === "sample").map((p) => p.code)).toEqual(["SAMPLE"]);
  });

  it("finds a programme however its code was typed, and nothing for a code it does not hold", () => {
    expect(findProgramme("sample")?.code).toBe("SAMPLE");
    expect(findProgramme(" s-a-m-p-l-e ")?.code).toBe("SAMPLE");
    expect(findProgramme("NOTACODE")).toBeNull();
    expect(findProgramme("")).toBeNull();
  });
});

/** The register must never be bundled for a browser: it holds every organisation's code. */
describe("the register stays on the server", () => {
  it("is imported only by server code: the route that answers one code at a time, and a server page", () => {
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.tsx?$/.test(entry) || entry.includes(".test.")) continue;
        // An actual import, not a mention in a comment.
        if (/from\s+["'][^"']*programme-register["']/.test(readFileSync(path, "utf8"))) importers.push(path.replace(`${process.cwd()}/`, ""));
      }
    };
    walk(join(process.cwd(), "src"));
    // The lookup route, the monthly-tick route (which only counts a programme that offers it), the organisation's
    // report page (which finds an organisation by its private key), the proxy that gives a wrong report key a real
    // 404, and the poster page (which drops a code that is not in the register).
    expect(importers.sort()).toEqual([
      "src/app/api/programme/count/route.ts",
      "src/app/api/programme/route.ts",
      "src/app/partners/report/[token]/page.tsx",
      "src/app/partners/toolkit/poster/page.tsx",
      "src/proxy.ts"
    ]);
  });
});
