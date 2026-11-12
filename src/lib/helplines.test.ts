import { describe, expect, it } from "vitest";

import { HELPLINES_CHECKED, buildHelplineCard, parseLang, telHref } from "@/lib/helplines";
import { EMBED_CSP, escapeHtml, parseTheme, renderHelplineEmbed } from "@/lib/helplines-embed";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { LOCALES } from "@/lib/i18n/types";
import { HELPLINES } from "@/lib/safety";

describe("buildHelplineCard", () => {
  it("carries exactly the national numbers the app itself uses", () => {
    const card = buildHelplineCard("en");
    expect(card.helplines.map((h) => [h.id, h.number, h.alternateNumber])).toEqual([
      ["tele-manas", HELPLINES.india.teleManas, HELPLINES.india.teleManasAlt],
      ["emergency", HELPLINES.india.emergency, undefined]
    ]);
  });

  it("says in which language it is written and when its numbers were last checked", () => {
    expect(buildHelplineCard("ta").language).toBe("ta");
    expect(buildHelplineCard("en").checked).toBe(HELPLINES_CHECKED);
    expect(HELPLINES_CHECKED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses the app's own reviewed wording in every language, never a blank", () => {
    for (const locale of LOCALES) {
      const card = buildHelplineCard(locale);
      const t = createTranslator(locale);
      expect(card.title, locale).toBe(t("safety.crisisTitle"));
      expect(card.notice, locale).toBe(t("safety.notMedicalBody"));
      for (const line of card.helplines) {
        expect(line.name.trim(), `${locale} ${line.id} name`).not.toBe("");
        expect(line.detail.trim(), `${locale} ${line.id} detail`).not.toBe("");
      }
    }
  });

  it("keeps every number dialable: Latin digits, spaces and hyphens only", () => {
    for (const locale of LOCALES) {
      for (const line of buildHelplineCard(locale).helplines) {
        for (const number of [line.number, line.alternateNumber].filter(Boolean) as string[]) expect(number, `${locale} ${line.id}`).toMatch(/^[0-9-]+$/);
      }
    }
  });

  it("carries the sudden-stop warning (firm rule 3) in every language", () => {
    for (const locale of LOCALES) expect(buildHelplineCard(locale).notice.length, locale).toBeGreaterThan(60);
  });
});

describe("parseLang and parseTheme", () => {
  it("fall back to English and light for anything unknown", () => {
    expect(parseLang("hi")).toBe("hi");
    for (const bad of ["fr", "", "HI", null, undefined, "../../etc/passwd"]) expect(parseLang(bad as never), String(bad)).toBe("en");
    expect(parseTheme("dark")).toBe("dark");
    for (const bad of ["blue", "", null, undefined]) expect(parseTheme(bad as never), String(bad)).toBe("light");
  });
});

describe("telHref", () => {
  it("writes a number the way a phone dials it", () => {
    expect(telHref("14416")).toBe("tel:14416");
    expect(telHref("1-800-891-4416")).toBe("tel:18008914416");
  });
});

describe("renderHelplineEmbed", () => {
  it("is a whole page with a tap-to-call link for every number", () => {
    const html = renderHelplineEmbed(buildHelplineCard("en"));
    expect(html.startsWith("<!doctype html>")).toBe(true);
    for (const href of ["tel:14416", "tel:18008914416", "tel:112"]) expect(html).toContain(`href="${href}"`);
    expect(html).toContain('lang="en"');
    expect(html).toContain("noindex");
  });

  it("has no script, no form and nothing that loads from elsewhere, in any language or theme", () => {
    for (const locale of LOCALES) {
      for (const theme of ["light", "dark"] as const) {
        const html = renderHelplineEmbed(buildHelplineCard(locale), { theme });
        expect(html, `${locale} ${theme}`).not.toMatch(/<script|<form|<img|<iframe|<link|@import|url\(/i);
        expect(html.match(/https?:\/\/[^"'\s<>)]+/g) ?? [], `${locale} ${theme}`).toEqual([expect.stringMatching(/^https:\/\/recoverly\.co\.in\//)]);
      }
    }
  });

  it("follows the language and the theme", () => {
    const html = renderHelplineEmbed(buildHelplineCard("hi"), { theme: "dark" });
    expect(html).toContain('lang="hi"');
    expect(html).toContain('class="dark"');
    expect(html).toContain("https://recoverly.co.in/hi/support");
  });

  it("escapes anything that is not its own markup", () => {
    const card = buildHelplineCard("en");
    card.title = '<img src=x onerror="alert(1)">';
    card.notice = "</p><script>alert(2)</script>";
    card.helplines[0].name = '"><b>';
    const html = renderHelplineEmbed(card);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).not.toContain('"><b>');
    expect(html).toContain("&lt;img");
  });

  it("escapes the five dangerous characters", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });

  it("may be framed (that is its whole purpose) but may do nothing else", () => {
    expect(EMBED_CSP).toContain("frame-ancestors *");
    expect(EMBED_CSP).toContain("default-src 'none'");
    expect(EMBED_CSP).not.toMatch(/script-src|connect-src|img-src|'unsafe-eval'/);
  });
});
