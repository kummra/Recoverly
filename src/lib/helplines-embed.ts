/**
 * The HTML for the embeddable help card (`/embed/help`): one self-contained page
 * with its own small stylesheet and no script, no tracking, no cookies and no
 * requests of its own. A partner puts it in an iframe on their site or intranet.
 *
 * Plain on purpose. It has to work inside someone else's page, on any phone, in
 * any of the nine languages, and never be a way to run anything on that page.
 */
import { type HelplineCard, telHref } from "@/lib/helplines";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { absoluteUrl } from "@/lib/seo/alternates";

export type EmbedTheme = "light" | "dark";

export function parseTheme(value: string | null | undefined): EmbedTheme {
  return value === "dark" ? "dark" : "light";
}

/**
 * What the page may do: nothing except draw itself. No scripts, no outside
 * requests, no forms. `frame-ancestors *` is what lets other sites put it in a
 * frame; browsers that understand it ignore the site's blanket `X-Frame-Options:
 * DENY` for this one page, and every other page keeps being refused.
 */
export const EMBED_CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors *";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

const STYLE = `
:root{--bg:#ffffff;--fg:#111827;--muted:#4b5563;--line:#d1d5db;--accent:#047857;--warn:#fffbeb;--warn-line:#f59e0b}
.dark{--bg:#0f172a;--fg:#f1f5f9;--muted:#cbd5e1;--line:#334155;--accent:#34d399;--warn:#1e1b0f;--warn-line:#b45309}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans Devanagari","Noto Sans Tamil","Noto Sans Telugu","Noto Sans Kannada","Noto Sans Malayalam","Noto Sans Gujarati","Noto Sans Gurmukhi",sans-serif;background:var(--bg);color:var(--fg)}
main{max-width:30rem;padding:16px}
h1{margin:0 0 12px;font-size:1.05rem;line-height:1.35}
ul{list-style:none;margin:0;padding:0}
li{border:1px solid var(--line);border-radius:12px;padding:12px;margin:0 0 10px}
.name{font-weight:600}
.detail{color:var(--muted);font-size:.875rem}
.nums{margin-top:6px;display:flex;flex-wrap:wrap;gap:8px}
a.num{display:inline-block;min-height:44px;padding:9px 14px;border-radius:10px;border:2px solid var(--accent);color:var(--accent);font-weight:700;font-size:1.1rem;text-decoration:none}
a.num:focus-visible,a.by:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.notice{margin:12px 0 0;padding:10px 12px;border-left:4px solid var(--warn-line);background:var(--warn);font-size:.8125rem;color:var(--muted);border-radius:6px}
.by{display:block;margin-top:12px;font-size:.8125rem;color:var(--muted)}
a.by{color:var(--accent);text-decoration:underline}
`;

/** The finished page. Every string that came from anywhere but this file is escaped. */
export function renderHelplineEmbed(card: HelplineCard, options: { theme?: EmbedTheme } = {}): string {
  const theme = options.theme ?? "light";
  const t = createTranslator(card.language);
  const items = card.helplines
    .map((line) => {
      const numbers = [line.number, line.alternateNumber]
        .filter((n): n is string => Boolean(n))
        .map((n) => `<a class="num" href="${escapeHtml(telHref(n))}">${escapeHtml(n)}</a>`)
        .join("");
      return `<li><div class="name">${escapeHtml(line.name)}</div><div class="detail">${escapeHtml(line.detail)}</div><div class="nums">${numbers}</div></li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="${escapeHtml(card.language)}" class="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(card.title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<h1>${escapeHtml(card.title)}</h1>
<ul>${items}</ul>
<p class="notice">${escapeHtml(card.notice)}</p>
<a class="by" href="${escapeHtml(absoluteUrl(card.language, "support"))}" target="_blank" rel="noopener">${escapeHtml(t("poster.sub"))}</a>
</main>
</body>
</html>
`;
}
