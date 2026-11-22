# Search visibility (SEO)

Written 22 November 2026, after finding that search engines had almost nothing of the site.

## Where it stood

- `site:recoverly.co.in` returned **no pages in Bing**, and nothing for the old `recoverly-app.vercel.app` address either.
  (Google cannot be queried from a script; check it in Search Console.)
- The likely causes, none of them a bug in the pages themselves: a new domain with few links to it; the links that do
  exist (the press release copies on about 28 news sites) point at `recoverly-app.vercel.app`, not the real domain; and
  Search Console was never set up successfully, because the verification file had been put in
  `src/app/dashboard/` where nothing serves it (it returned 404).
- Every page in the sitemap already had a correct self-canonical, hreflang for the translated pages, Open Graph tags and
  sensible titles. The home page had one heading ("You are building a healthier identity") and about 300 words that never
  named alcohol, India or the languages.

## What the code now does

| Change | Where |
| --- | --- |
| The old Vercel address redirects (308) to `recoverly.co.in`, except `/api` | `next.config.mjs` `redirects()` |
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
