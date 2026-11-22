#!/usr/bin/env node
/**
 * Tell search engines that use IndexNow (Bing, and through it DuckDuckGo and
 * Yahoo results, plus Yandex, Seznam and Naver) which pages exist or changed.
 *
 *   node scripts/indexnow.mjs                 # every URL in the live sitemap
 *   node scripts/indexnow.mjs <url> [<url>…]  # just these pages
 *
 * It sends nothing private: only addresses that are already public. Google does
 * not use IndexNow; for Google, add the site in Search Console and submit the
 * sitemap there (see docs/seo.md).
 *
 * The key is not a secret. The protocol requires it to be published at
 * https://recoverly.co.in/<key>.txt so the search engine can check we own the site.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HOST = "recoverly.co.in";
const BASE = `https://${HOST}`;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const keyFile = readdirSync(path.join(root, "public")).find((name) => /^[a-f0-9]{32}\.txt$/.test(name));
if (!keyFile) {
  console.error("No IndexNow key file found in public/ (expected <32 hex characters>.txt).");
  process.exit(1);
}
const key = readFileSync(path.join(root, "public", keyFile), "utf8").trim();
if (`${key}.txt` !== keyFile) {
  console.error("The key file's name and contents must match.");
  process.exit(1);
}

let urls = process.argv.slice(2);
if (urls.length === 0) {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
urls = [...new Set(urls)].filter((u) => u.startsWith(BASE));
if (urls.length === 0) {
  console.error("Nothing to submit.");
  process.exit(1);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key, keyLocation: `${BASE}/${keyFile}`, urlList: urls })
});
// 200 = accepted, 202 = accepted and the key check is pending. Anything else is a problem.
console.log(`Submitted ${urls.length} URLs. IndexNow answered ${response.status} ${response.statusText}`);
process.exit(response.status === 200 || response.status === 202 ? 0 : 1);
