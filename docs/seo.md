# Search visibility (SEO)

Written 22 November 2026, after finding that search engines had almost nothing of the site.

## Where it stood

- `site:recoverly.co.in` returned **no pages in Bing**, and nothing for the old `recoverly-app.vercel.app` address either.
- **Google was different.** A `site:` search in a browser the same day listed 66 pages ("About 69 results"): 63 of the 119
  sitemap URLs, plus `/login` and the two example report pages. So Google had already found the site, and a claim from an
  outside tool that only `/hi/faq` is indexed is wrong. A `site:` search is truncated and is not the authority: the Pages
  report in Search Console is (it also says why a page is not indexed). Every page checked was 200, `index, follow` and
  self-canonical, and crawlers (Googlebot included) get the same response as everyone else.
- **Search Console agrees** (Pages report, domain property `recoverly.co.in`, data to 16 November): 66 indexed, 64 not.
  The 64 are 10 excluded by `noindex` (the code marks several organisation pages that way on purpose), 1 not found (`/ml`:
  none of the bare language roots `/hi`, `/ml` and so on exists, they all 404), 33 "discovered, not yet crawled", 13
  "duplicate, Google chose a different canonical" and 7 "crawled, not indexed". For `/learn`, URL inspection shows Google
  chose `https://recoverly-app.vercel.app/learn` as the canonical of `https://recoverly.co.in/learn`: the old address is
  the cause, and the 308 redirect above is the fix. It works as Google re-crawls the old address, so expect the numbers to
  move over weeks (the other duplicates are probably the same cause; not checked one by one). The sitemap (submitted
  11 November, read 21 November) shows Success. Indexing was requested on 22 November for `/`, `/learn` and `/support`, and on 23 November for
  `/learn/after-a-drinking-slip` and `/terms` (the last two were "discovered, not crawled" and "duplicate" respectively).
- The likely causes of the thin results elsewhere, none of them a bug in the pages themselves: a new domain with few links
  to it; the links that do exist (the press release copies on about 28 news sites) point at `recoverly-app.vercel.app`, not
  the real domain; and the verification file had been put in `src/app/dashboard/` where nothing serves it (it returned 404),
  so the HTML-file method of Search Console verification could not have worked.
- Every page in the sitemap already had a correct self-canonical, hreflang for the translated pages, Open Graph tags and
  sensible titles. The home page had one heading ("You are building a healthier identity") and about 300 words that never
  named alcohol, India or the languages.

## What the code now does

| Change | Where |
| --- | --- |
| The old Vercel address redirects (308) to `recoverly.co.in`, except `/api` | `next.config.mjs` `redirects()` |
| A bare language address (`/hi`, `/ml` and the other seven) redirects (307, temporary on purpose) to the home page; Google had listed `/ml` as a 404 | `next.config.mjs` `redirects()` |
| Search Console verification file served from the site root | `public/google5cd4881e39b007ef.html` |
| IndexNow key file and a script that tells Bing and other IndexNow engines about every sitemap URL | `public/<key>.txt`, `scripts/indexnow.mjs` |
| Home title and description say what the product is (brand name alone is shared with unrelated products) | `src/app/layout.tsx` |
| About 500 words of plain text, five headings, six guide links and five answered questions on the signed-out English home page | `src/components/home-about.tsx`, words in `src/lib/seo/home-content.ts` |
| English support page title carries the helpline ("Alcohol helplines in India: Tele-MANAS 14416") | `src/app/support/page.tsx` |
| Organization (with description, area served, languages, the recognition line), WebSite (with alternate names) and WebApplication (with feature list) markup | `src/components/structured-data.tsx` |
| The competition result, stated once and printed on `/press` | `src/lib/recognition.ts` |
| Sitemap: home, support and press dates refreshed; the sign-in form removed | `src/app/sitemap.ts` |
| Tests pin all of the above | `src/lib/seo/seo.test.ts` |

Rules this work keeps:

- **Markup and page must agree.** The feature list in the markup and the list on the home page come from one array;
  the award line in the markup and on `/press` come from one constant.
- **No claims the site cannot back up**: no ratings, reviews or `reviewedBy` (the guides have had no clinical review).
  A test fails if one appears.
- The home text is English-only, shown to signed-out readers (crawlers included), like the organisation pages. The
  translated pages (guides, support, FAQ, policy) are where other languages are found.
- A page that is in the sitemap must not be disallowed in `robots.ts` (tested). The organisation pages that are
  deliberately `noindex` (pilot, compliance, regional, the safety documents, the toolkit) stay out of the sitemap.

## What only the owner can do (it needs an account)

1. **Google Search Console** (search.google.com/search-console): add the property `https://recoverly.co.in/` (URL prefix),
   choose the HTML-file method (the file is deployed), press Verify. Then Sitemaps, add `sitemap.xml`. Then URL inspection:
   "Request indexing" for `/`, `/learn`, `/support`, `/faq`, and the six guides. This is the single biggest step.
2. **Bing Webmaster Tools** (bing.com/webmasters): import the site from Search Console, or add it and submit the sitemap.
3. **Links to the real address.** Search engines rank what other sites link to. Ask the places that already talk about the
   project to link `https://recoverly.co.in` (not the vercel.app address, though that now redirects): the competition
   entry (Future Foundations / Global Social Leaders), the school's website and social profiles, the LinkedIn profile and a
   company page, the descriptions of the YouTube and Vimeo videos, Instagram, and the news sites that carried the release.
   Listings that are free and relevant: Product Hunt, AlternativeTo, Startup India, NGO and de-addiction directories.
4. **Look again in a few weeks**: Search Console, Pages report (what is indexed and why not), Performance (what people
   searched for). New domains take weeks, not days.

## Other search engines (checked 22 and 23 November 2026)

| Engine | What registering means | State |
| --- | --- | --- |
| Bing | Bing Webmaster Tools (sign in, import the site from Search Console, submit the sitemap), plus IndexNow | IndexNow sent for all 119 URLs (accepted). **Done on 23 Nov:** the site was imported into Bing Webmaster Tools from Search Console, `sitemap.xml` was submitted ("successfully submitted for processing") and 55 pages (every English page, the six guides, and the Learn, Support, FAQ and Guide pages in each language) went through URL Submission (quota 100 a day). Bing says reports can take up to 48 hours. |
| Yahoo | Yahoo's own help page says to submit through Bing Webmaster Tools; allow 6 to 8 weeks or longer | Covered once Bing is done |
| DuckDuckGo | No submission form. It runs its own crawler (DuckDuckBot, which obeys robots.txt) but takes its links and images largely from Bing | Covered once Bing is done; `robots.txt` allows every crawler on the public pages |
| Brave | The form at `search.brave.com/submit-url` takes one address at a time (reload the page between submissions) | Submitted on 22 Nov: `/`, `/learn`, `/support`, `/faq`, `/guide` and the six English guides; each answered "Success". Before that Brave had no pages. |
| Firefox | A browser, not a search engine: it offers Google, Bing, DuckDuckGo and others | Nothing to register |
| Yandex, Naver, Seznam | Receive IndexNow pings | Sent. A separate account is not worth it for this audience |
| Mojeek | No submission. A Mojeek staff member says there is currently no way to submit a site, and that prominent, genuine links are what get one found; they will look at crawl problems for a site if asked in the community forum (community.mojeek.com). MojeekBot obeys robots.txt | Nothing to submit. `robots.txt` allows MojeekBot. Its own search showed a human check on 23 Nov, so its index was not checked |
| Yep | No submission. YepBot and AhrefsBot (both obey robots.txt) build the index behind Yep and Ahrefs. Yep now presents itself as an API for AI agents, and its own search answered "unavailable" when tried | Nothing to submit. Links are what bring AhrefsBot to a site |
| Stract | No submission form found. A search summary of its webmasters page describes only controlling StractBot through robots.txt (the page itself was blocked by the network filter of the machine used) | Nothing to submit. `robots.txt` allows StractBot |
| Alexandria | No submission form found. Its crawler is AlexandriaOrgBot, which obeys robots.txt | Nothing to submit. `alexandria.org` did not resolve in DNS on 23 Nov (checked from three resolvers), so the site could not be opened |
| Kagi (Teclis, TinyGem) | No submission for either. Kagi's Small Web list is for "personal blogs and websites" and "non-commercial content", and contributions go through its GitHub repository | Recoverly is an app with paid organisation plans, not a personal blog: not eligible, so not submitted |

Bing's own `site:` search, and Mojeek's, start asking for a human check after a few queries: never solve it. Use Bing Webmaster Tools instead.

For the engines with no submission, what helps is the same everywhere: the crawler can reach the pages (the catch-all rule in
`robots.txt` allows every crawler on the public pages and names none of them), the sitemap is listed in `robots.txt`, and other
sites link to `https://recoverly.co.in`. Draft messages for the links are in the owner's folder, not in this repository.

## After a deploy that adds or changes pages

```bash
node scripts/indexnow.mjs                       # every URL in the live sitemap
node scripts/indexnow.mjs https://recoverly.co.in/learn   # or just some
```

It sends only addresses that are already public. Google does not use IndexNow.

## Checking it by hand

```bash
curl -sI -H "Host: recoverly-app.vercel.app" https://recoverly.co.in/support | head -3   # not useful on Vercel: test locally with next start
curl -s https://recoverly.co.in/google5cd4881e39b007ef.html                                # google-site-verification: ...
curl -s https://recoverly.co.in/sitemap.xml | grep -c "<loc>"
```

The redirect is easiest to test with `next build && next start -p 3100` and
`curl -sI -H "Host: recoverly-app.vercel.app" http://localhost:3100/support` (expect 308 to `https://recoverly.co.in/support`,
and 200 for `/api/helplines`).

## Not done, and why

- **A translated home page per language.** It would help Hindi and other searches, and needs translations reviewed by
  native speakers first (the project's rule for health-adjacent text).
- **New guides for more search terms.** Each needs sources checked and, ideally, a clinical adviser. Do not add health
  content just to rank.
- **`aggregateRating` / reviews markup.** There are no reviews.
