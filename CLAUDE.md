# Recoverly — Anti-Alcohol Recovery App

A Next.js 16 (App Router) web app that helps people reduce and quit alcohol. It is one
part of a larger anti-addiction project submitted for the **Pradhan Mantri
Rashtriya Bal Puraskar** (national youth award, India; its 15 August 2026 deadline has
passed). It is now also being presented as a business (Shark Tank India): see
`docs/feature-roadmap.md` for the business model and what each feature is for.

Users may be vulnerable people in recovery, so **correctness and safety come before
features**. When in doubt, choose the safer, gentler behaviour.

Live deployment: https://recoverly.co.in

## Architecture

- **Framework:** Next.js 16 (App Router, Turbopack), React 18, TypeScript.
- **UI:** Tailwind CSS + shadcn-style primitives (Radix), Recharts, lucide-react.
- **Auth:** Firebase Authentication (email/password, Google). Phone/OTP sign-in was
  removed on 2026-10-11 — keep the Phone provider disabled in the Firebase console too,
  or the SMS endpoint stays open to abuse even with no UI for it.
- **Data:** Cloud Firestore, written from the browser via the Firebase client SDK.
  - `users/{uid}` — `goalWeeklyMl`, `goalType` (`reduce`|`quit`), `reminderTime`,
    `motivation`, `displayName`, `updatedAt`. `goalType` matters: `goalWeeklyMl: 0`
    alone is ambiguous between "no weekly limit" and "aiming for zero alcohol".
  - `users/{uid}/drinkRecords/{id}` — `quantity` (ml), `type`, `mood?`, `createdAt`
  - `users/{uid}/aiChats/{chatId}/messages/{id}` — chat history
  - `users/{uid}/feedback/{id}` — answers to the "what would help you" survey. Written only
    by the server (`/api/feedback`); `firestore.rules` gives browsers no access to it.
- **AI coach:** a **Qwen** model on **Groq Cloud** (OpenAI-compatible API) in
  `src/app/api/ai/route.ts`. `GROQ_API_KEY` is server-side only and the model is overridable
  via `GROQ_MODEL`. Every request verifies the caller's Firebase ID token and resolves a `uid`.
  Groq withdraws and renames models without notice and the default is a "preview" model: see
  "The AI coach: limits and failures" below before touching it.
- **Validation:** shared between Zod (`src/lib/schemas.ts`) and `firestore.rules`.
- **Deploy:** Vercel (primary); Docker + k8s manifests exist for Oracle Cloud.

### Key files
- `src/components/auth-provider.tsx` — Firebase auth context.
- `src/lib/firestore.ts` — all Firestore reads/writes.
- `src/lib/analytics.ts` — consumption stats (monthly totals, projections, insights).
- `src/app/api/ai/route.ts` — the AI coach endpoint (safety-critical; see rules below).
- `firestore.rules` — per-user isolation (`isOwner`) + field validation.

## ⚠️ Repository layout — read before any git command

This git repo contains **only the clean web app**. The *parent* folder on disk still
holds an older, uncommitted Cursor/Expo build (breathalyser, Firebase DataConnect,
Genkit, Oracle sync). A full backup of that legacy project lives outside the repo at
`../Recoverly-legacy-backup-2026-06-26.zip`, and the features worth porting are catalogued
in `docs/legacy-port-inventory.md`.

- Do **not** run `git add -A` from the parent folder — it would commit the legacy mess.
- **Never** commit `.env*` or `*firebase-adminsdk*.json` (both are gitignored).
- Active work happens on a feature branch / worktree, then merges to `main`. The
  Vercel project is linked to `kummra/Recoverly` (GitHub integration connected
  2026-08-08); pushing to `main` auto-deploys to production — no manual
  `vercel --prod` needed.

## After a slip, and plans for hard moments

Two features built around the moments when someone is most likely to give up.

**After a slip** (`SlipMomentDialog`, `buildSlipMoment` in `analytics.ts`). When someone
whose goal is `quit` logs a drink after at least one whole drink-free day, a dialog says
what survives (the run, the personal best), repeats the two safety facts that matter at
that exact moment, and links the slip guide. Rules that must stay true:
- `quit` goals only. A drink inside a cut-down plan is not a slip; no goal means no judgement.
- It counts WHOLE days between the last drink and today. `buildProgress` counts calendar
  days including today, which is one higher; a dialog that said "1 day alcohol-free" to
  someone who drank yesterday would be false, and would fire daily for a daily drinker.
- Its safety text is the reviewed wording: `slip.body`, `slip.tolerance`, `slip.next`,
  `slip.help` and `slip.guideTitle` are copied word for word from the "after a drinking
  slip" guide in each language, and the withdrawal warning is the standing
  `WithdrawalWarning`. Do not rewrite these in one language; change the guide and copy.
- No shaming, and never a counter reset to zero.

**Plans** (`src/lib/plans.ts`, `PlanEditor` in Settings, `PlanList` on the "looking
ahead" card and the craving screen). "When X happens, I will do Y", up to three. They are
free text about cravings and family, so they live in `localStorage` only: never on the
server, never in the export, never in a prompt. Consequences already handled: deleting the
account clears them from that browser (`clearPlans`); signing out does not (the intro and
the privacy policy say so); every edit goes through `updatePlans`, which re-reads storage
so a second tab cannot overwrite the first. They do not follow someone to a new phone.

Found while building these and fixed in the shared pieces: the dialog scrolls within the
visible screen (a taller-than-screen dialog used to clip its helplines on small phones),
its close button is announced in the reader's language, titles have room for Indic
scripts, and `prefers-reduced-motion` is honoured.

## The Learn guides (`/learn`)

Six long-form guides on stopping safely, AUDIT scores, standard drinks, cravings, slips
and helping a family member (`/learn/<slug>`, `/hi/learn/<slug>`…). They are the site's
main search content and they are **health information for people who may be in danger**,
so they are held to a higher bar than UI copy.

- **Published language by language.** `LEARN_LOCALES` in `src/content/learn/types.ts` lists
  the languages the guides exist in; it is not the app's language list. A translation is
  added (catalog file + entry in `index.ts` + code in `LEARN_LOCALES`, in one change) only
  after an independent reviewer has checked its safety-critical passages against the
  English. Routes, hreflang, the sitemap and the language picker all read that list, and
  `learnPath()` sends readers of an unpublished language to the English guide.

- The text lives in `src/content/learn/<locale>.ts`, **not** in the i18n dictionaries.
  The dictionaries ship to every browser in all nine languages; the guides are imported
  only by server components and reach the browser as HTML. `learn.test.ts` fails if a
  client component imports them.
- `meta.ts` holds what does not change with language: the sources each guide was checked
  against, the date the facts were last checked (shown on the page and in the sitemap),
  and related guides.
- Every factual statement was traced to a page from a public-health body (WHO, NHS, NICE,
  NIH/NIAAA/MedlinePlus, Government of India) by one agent and independently re-checked
  against the live page by another. **No clinician has reviewed them**, and the pages do
  not claim one has: the schema is plain `Article`, never `MedicalWebPage`/`reviewedBy`.
  Do not add a reviewer, an author credential or a statistic that is not in a source.
- Rules the tests enforce: no medicine names or doses, no shaming labels, a `warning`
  callout wherever stopping is discussed, helpline numbers present, every translation
  structurally identical to English with every number preserved in Latin digits.
- To change a guide: edit the English, re-check the fact against its source, bump
  `reviewed` in `meta.ts`, and re-translate that guide in every published language.
  Never edit one language alone.
- Helplines printed in the guides: 112, Tele-MANAS 14416 / 1-800-891-4416, the national
  de-addiction helpline 14446, and (family guide) Women Helpline 181 and NCW 14490. KIRAN
  is deliberately absent (merged into Tele-MANAS in 2024).

## The AI coach: limits and failures

- **It depends on an outside provider whose limits are small.** On this account the model
  is limited to roughly 30 requests a minute, **1,000 requests a day, 8,000 tokens a
  minute and about 200,000 tokens a day** (Groq's page and the `x-ratelimit-*` response
  headers; check `console.groq.com/settings/limits`). A reply is a few hundred tokens, so
  the whole app can serve very roughly a hundred or two coach replies a day. That is the
  ceiling to plan around before any partner pilot: a paid plan or a second provider is a
  cost line, not an option.
- **Languages cost very different amounts.** Measured tokens per character on this model:
  English 0.19, Hindi 0.41, Marathi 0.53, Tamil 0.50, Malayalam 0.58, Telugu 0.61, Kannada
  0.65, Gujarati 0.69, Punjabi 0.81. A Punjabi conversation uses about four times the shared
  allowance of an English one.
- **Long chats are trimmed before they are sent** (`lib/ai-context.ts`, `trimToTokenBudget`).
  The app used to send the last 50 messages; one request over the per-minute limit is
  refused every time, so a long-running chat would simply stop working. The saved history
  is untouched. Do not raise the budget without re-checking the numbers above.
- **Failures say what happened** (`lib/ai-errors.ts`): the route answers `busy` (provider
  429) or `unavailable` (anything else, including a withdrawn model), and the page offers
  Try again, Craving SOS and the helplines, none of which depend on the AI. Never go back to
  a bare "could not get a response". Crisis language still gets the helpline text even when
  the model call fails (see the route).
- **To diagnose:** Vercel keeps runtime logs for one hour on this plan, so ask someone to
  send a message, then read the log (`[POST /api/ai] status=… code=… message=…`). A
  `model_not_found` means the model id is gone: list valid ids with
  `GET https://api.groq.com/openai/v1/models` and set `GROQ_MODEL`.
- `/dashboard?sos=1` opens Craving SOS. The installed app's shortcut and the coach's
  failure message both point at it.

## Reading aloud and sharing

- **Listen** (`ListenButton`, `lib/speech.ts`) uses the device's own voices and appears only
  when the device has a voice for that language: an English voice reading Tamil is worse
  than no button. Desktop browsers often lack Marathi, Punjabi, Malayalam and Gujarati;
  phones usually have more.
- **The coach's replies use local voices only** (`localOnly`): some browsers send text to a
  server to be spoken, which is fine for a public guide and not for a private conversation.
  The voice is chosen by the script of the text, not the app's language, because the coach
  answers in whatever language the person wrote in.
- **Helplines are read digit by digit** (`prepareForSpeech`), or 14416 is heard as "fourteen
  thousand four hundred sixteen" and cannot be written down. Add any new helpline number to
  `DIAL_NUMBERS` in `lib/speech.ts`. Other numbers (a year, 330 ml) are left alone on purpose.
- **Share** (`ShareButton`) passes the page's address and one line of plain text, through the
  phone's share sheet (WhatsApp among its choices) or by copying the link. It says what the
  page is, never who is sending it. It is on every guide and on the support page.

## The privacy lock (`/settings`)

An optional PIN in front of the app on one device, for people who share a phone or do not
want a recovery app opened by whoever picks theirs up (`lib/app-lock.ts`,
`AppLockProvider`, `LockScreen`, `PrivacyLock`). Off by default. Rules that must stay true:
- **It is a screen, not encryption**, and the settings card says so. The PIN is kept only as
  a salted PBKDF2 hash in `localStorage`; a four-digit PIN has ten thousand possibilities
  whatever the hash. Do not describe it as secure storage anywhere.
- **It must never trap anyone.** A damaged or unreadable setting means *no lock*. A browser
  that cannot keep or check a lock gets none. "Forgot your PIN?" signs the person out,
  which removes the lock; their records stay in the account. Signing out always removes it.
- **Help is never behind it.** The lock screen always shows Tele-MANAS and 112 as
  tap-to-call links.
- **Locking removes the app from the page** rather than covering it, so nothing is left to
  read behind the lock screen.
- Wrong guesses are counted in `localStorage`, so reloading the page does not reset the
  delay (30 seconds after five wrong tries, doubling to fifteen minutes). Turning the lock
  off needs the PIN. A new tab or a relaunched installed app starts locked; idle time and
  time away both count (1, 5 or 15 minutes; a shorter choice would lock while someone is
  reading a guide).
- Verified against the Auth emulator: set, wrong PIN, five wrong tries and the wait across a
  reload, unlock, idle lock, fresh-tab lock, turning off, junk setting, and forgot-PIN.

## For organisations (`/partners`) and enquiries

A public, English-only page for clinics, employers, colleges, insurers and NGOs who might run
a pilot, with an enquiry form (`PartnerEnquiryForm`, `lib/partners.ts`,
`app/api/partners/route.ts`). It exists to turn the business model into real conversations.
- **It claims no customers, no revenue and no product that does not exist.** It says what
  is free and live today and what "a pilot would explore". Keep it that way: a judge, an
  investor or a regulator will read it. It also says guides have not been reviewed by a
  clinician, which is true (see the Learn section).
- Enquiries go to the **server-only** Firestore collection `partnerEnquiries` (written with
  the Admin SDK; Firestore's default deny gives browsers no access, so no rules change was
  needed). The route checks origin, rate-limits (5 an hour per address, 200 an hour overall),
  caps the body at 10 KB, answers a honeypot as if it worked, and stores only what was
  typed plus `createdAt`. No address or browser details are kept.
- **Nothing is deleted automatically.** The owner decided against a retention period
  (12 Nov 2026), and the privacy text (`privacy.s8*`) says enquiries are kept until the person
  asks for them to be deleted. Do not add a `deleteAt` field or a TTL policy without changing
  that text first: a policy that contradicts the policy page is worse than none. To honour a
  request, delete the document in the Firebase console.
- **Read the enquiries** in the Firebase console, Firestore, `partnerEnquiries`. There is no
  email notification yet, so someone has to look.
- **An employer, college, insurer, TPA or government body never receives individual-level data, with or
  without consent** (firm rule 4 below): consent given to your own employer, institution or insurer is not
  freely given, so the code refuses it. What exists: the person's own summary link, the optional anonymous
  monthly headcount and progress figures (numbers for groups of 20 or more, never a list), and, **for a clinic
  or community service only**, a team workspace where a person who chooses to can share their own summary by
  name with that team. See "Summary links, the headcount, progress figures and the team workspace" below.
  A list of who joined, a per-person view nobody chose to send, a count below 20 or anything sent in the
  background is **not built and not to be built** without the owner's explicit decision and a rewritten policy.

## The business contact address

One constant, `CONTACT_EMAIL` in `lib/contact.ts`, used on `/partners`, in the privacy
policy's Contact section (`/privacy#contact`, linked from the footer in every language) and in
the Organization markup that search engines read (`components/structured-data.tsx`). The owner
chose to publish it, so expect spam. Change the address in that one file.

The policy says the address is for questions, not emergencies, and points to the support
page. **Keep that sentence**: someone in crisis may write to it, and nobody is watching it
in real time.

## Someone to call, the weekly look-back, and the survey

- **Someone I can call** (`lib/support-person.ts`, `SupportPersonEditor` in Settings, the
  Call and Text buttons in `craving-sos.tsx`): one name and one number, kept in the browser's
  `localStorage` under `recoverly:person:{uid}`. Like the plans and the lock it is
  **device-only**: never sent to the server, never in the data export, never in the coach's
  prompt. Account deletion clears it on the device it is done on; signing out does not (the
  Settings text says so, because of shared phones). The number must be 7 to 15 digits with
  only spaces, `- ( ) .` and a leading `+` besides, and only the digits (and that `+`) are
  stored, so a stored value can only ever become a plain `tel:` or `sms:` link. A write the browser refuses is reported,
  not swallowed. With nobody saved, the craving screen keeps its old generic "text someone".
- **Weekly look-back** (`lib/weekly-review.ts`, `WeeklyReviewCard` on the dashboard): worked
  out from the records and cravings already loaded; stores nothing. It says nothing until
  there are three days of history, and days before the person started are never counted as
  alcohol-free. No score, nothing red: a drink day is an amber ring, the sentence carries the
  meaning (the dots are `aria-hidden` decoration), and after a hard week the headline goes
  neutral and the card offers a plan instead of a lecture.
- **"What would help you" survey** (`lib/feedback.ts`, `app/api/feedback/route.ts`,
  `FeedbackCard` in Settings): four options (counsellor, group, family, courses) and an
  optional note of up to 300 characters. The card says none of these exist yet; keep it so, as
  the organisations page does. The route verifies the caller's ID token, allows 5 answers an
  hour each and caps the body at 4 KB. Answers sit at `users/{uid}/feedback/{id}`, go with the
  account (`recursiveDelete`), are not in the data export and never enter a prompt.
  **To read them:** Firebase console, Firestore, Query builder, scope "Collection group",
  collection `feedback`.
- **Testing the survey locally:** with the blank `FIREBASE_PRIVATE_KEY` the route answers 503
  and the card shows "Could not send just now", which exercises the failure path without
  writing to the real database. The saving path is covered by mocked tests in
  `app/api/feedback/route.test.ts`.

## Organisation tools: programme codes, the toolkit, the help card

Built for the organisations in the business model (employers, colleges, clinics, NGOs). By default nothing
here shows an organisation anything about a person. What it can receive, only if the person chooses: the
anonymous monthly headcount and progress averages (numbers for groups of 20 or more) and, at a clinic or
community service, a team workspace (see "Summary links, the headcount, progress figures and the team workspace").

**Programme codes** (`lib/programme.ts`, `lib/programme-register.ts`, `lib/programme-membership.ts`,
`app/api/programme`, `/join/{code}`, `ProgrammeCard` / `ProgrammePrompt` / `ProgrammeEditor`).
An organisation gets a code; a person types it in Settings or scans a poster's QR code; the
organisation's name, a welcome and up to four support contacts appear on their dashboard. Rules that
must stay true:
- **The organisation is told nothing about who joined or what anyone logs.** That sentence is shown to
  the person in nine languages (`programme.private`, `programme.privateCounted` for a programme that offers
  the headcount, `programme.privateWorkspace` for one with a team workspace; `useProgrammePrivacy` picks) and
  in the privacy policy (`privacy.s12*`), so it must remain true. Joining itself sends nothing about the
  person; the lookup carries no account. What can reach an organisation afterwards is only what the person
  separately ticks (the exceptions below). **Do not add a list, a log of lookups, a per-person figure or a
  dashboard beyond those without the owner's decision on rule 4 and without changing that text and the
  policy first.**
- **The register is server-only** (`programme-register.ts`; `programme.test.ts` fails if a client file
  imports it) and `GET /api/programme?code=` answers one code at a time. It is code, not a database:
  to add an organisation edit the register (its header says how), and the tests run
  `validateProgramme` over every entry (code 6 to 16 letters and digits, https links only, phone
  digits only, at most four contacts). Real codes are not guessable words.
- **Device-only**, like plans and the saved person: `recoverly:programme:{uid}` and a pending code
  `recoverly:programme-pending` in `localStorage`. Account deletion clears both. Signing out does not
  (the privacy text says so). Everything read back goes through `sanitiseProgramme`, so a hand-edited
  stored link can never be a script.
- The dashboard card **re-reads the programme from the server** each time it appears, so a number that
  changed or was withdrawn does not stay on a screen; a code that no longer exists shows "no longer
  available" and hides its old contacts.
- The organisation's contacts **never replace** Tele-MANAS and 112, which are shown to everyone and are
  not behind a code. The craving screen does not show them.
- A programme's `locale` is offered only to a first-time visitor (nobody with a saved language choice).
- `SAMPLE` is the demonstration programme: it has no organisation behind it and says so.

**The organisation toolkit** (`/partners/toolkit`): `KitGenerator`, `PosterSheet`, `lib/toolkit.ts`,
the printable `/partners/toolkit/poster`, the 45-minute session outline and the manager guide.
- A poster or sheet of pocket cards in any of the nine languages with a QR code. The poster carries the
  crisis line and the sudden-stop message (firm rules 2 and 3) in its language; the cards carry the
  helplines and "not a substitute for medical advice". A poster that invites people to cut down or stop
  must not be the only thing they read before stopping abruptly.
- **A code is checked before it goes on paper** (the form asks the server; the printable page drops a code
  that is not in the register). A QR code to "we do not recognise that code" would hang on a wall for months.
- **The QR encoder is ours** (`lib/qr.ts`, byte mode, level M, versions 1 to 10, no dependency; adding
  packages was not wanted). A printed code that does not scan is worse than none, so after ANY change to
  `lib/qr.ts` or how a code is drawn, run **`node scripts/verify-qr.mjs`**: it encodes a spread of texts
  (every version, every mask, non-English), turns them into pictures and has macOS's own decoder read
  them back. It needs a Mac, `rsvg-convert` and `swift`. `lib/qr.test.ts` covers the arithmetic (a
  published Reed-Solomon example) and the fixed patterns, not scannability.
- The eight non-English poster strings (`poster.*`) and the programme strings were written for this app and
  have **not** had a native-speaker review; the toolkit page says so to organisations.
- The session outline and manager guide add **no health facts of their own**: the one safety message is the
  app's own (`safety.withdrawalBody`, read from the dictionary), the emergency signs are a subset of the
  stopping-safely guide's list, and both link to the guides. Keep it that way: facts belong in the Learn
  guides, where they are sourced.

**The help card and feed** (`/embed/help`, `/api/helplines`, `lib/helplines.ts`, `lib/helplines-embed.ts`):
the national lines as a small iframe card and as JSON, for the "licensing and the safety layer" line of the
model. Only what the app itself treats as national lines (Tele-MANAS and 112), built from `lib/safety.ts`
and the reviewed dictionary text, so a change made there reaches every site that embeds it.
- Update `HELPLINES_CHECKED` whenever the numbers are re-checked against official pages.
- **Framing**: the blanket `X-Frame-Options: DENY` in `vercel.json` stays. `/embed/help` alone sends
  `Content-Security-Policy: … frame-ancestors *`, which modern browsers obey in preference to the old
  header, so only that page can be framed. After any change near headers, run the two `curl` checks in
  `docs/deploy-checklist.md` section 5. The card has no script, no form, no cookie and makes no request.
- Never add a number that has not been checked against an official source. (The national de-addiction
  helpline 14446 is the candidate; see the roadmap.)

**Enquiry alert** (`lib/notify.ts`): with `ENQUIRY_WEBHOOK_URL` set (a Slack or Discord webhook, https), a
saved enquiry sends one line to the team's channel. The line says only the kind of organisation and where to
read it, **never** the name, email, organisation or message, because a chat service must not receive them.
It cannot fail an enquiry (it has already been saved). With no variable set, nothing happens.

**Preparing for an appointment** (`/report`): the clinician summary lets the person type what they want
to tell or ask, and tick "include my plans for hard moments" (off by default). The notes exist only on that
page and in the printout, never saved or sent; the plans stay on the device unless the person puts them on
the sheet they hand over. Below it, the **Share a summary** card can make an encrypted link instead of
paper (next section): the notes and plans reach a link only if the person ticks them there.

## Summary links, the headcount, progress figures and the team workspace: the exceptions to firm rule 4

On 13 Nov 2026 the owner said: where a feature is really worth it and only the privacy statement stands
in the way, amend the statement and build it. Two features cleared that bar (the summary link and the
headcount). The same day, after a review that had declined three more (a clinic dashboard, outcome figures
for funders, live counters), the owner said to add them **but only with consent**; they became the progress
figures and the team workspace. **These four are the only ways a person's data can leave their account**,
and each is the person's own act, visible and reversible. The policy states them (`privacy.s12Body`
headcount, `s13Body` summary link, `s14Body` progress figures, `s15Body` team workspace, with `s1`, `s5`, the
FAQ answer, the login line and `programme.intro` pointing at them) and **`lib/privacy-policy.test.ts` ties the
numbers in the English and translated policy to the constants in code.** Change a number in code and in the
policy together, or it fails.

**Summary link** (the `ShareSummary` card on `/report`; `lib/share*.ts`; `app/api/share`; viewer at `/share/{id}#{key}`):
- **Encrypted in the browser** (AES-256-GCM through Web Crypto, a new key and nonce every time:
  `lib/share-crypto.ts`). The server stores only the nonce, the ciphertext, the maker's uid and two times, in the
  server-only Firestore collection `shares` (`lib/share-firestore.ts`, Admin SDK; default-deny rules, so no rules
  change). The **key is the part after `#`**, which browsers never send to a server, so Recoverly, link previews,
  mail scanners and proxies cannot read it. **Never put the key in a path, query, request body, log, cookie or
  storage.** Nothing about a link is kept on the device: it is shown once and cannot be shown again.
- **Only what the person ticks** goes in (`buildSnapshot`); the account is not an input, so email and display name
  cannot leak. The two starting points never include their own words, notes or plans. The viewer re-cleans everything
  it opens (`sanitiseSnapshot`) and renders plain text, so a link made by someone else can add nothing to the page.
- 1, 7 or 30 days; at most 5 at once; ciphertext capped at 24,000 characters; stop one or all from the card. Expired
  copies are removed when asked for, when their maker lists links, and 20 at a time whenever any link is made, and **all
  of a person's links go with their account** (`/api/account` calls `stopAllShares`). A link that never existed, ended
  or was stopped answers the same 404, so an address reveals nothing about itself.
- Optional belt-and-braces: a Firestore TTL policy on `shares.expiresAt` (a real Timestamp). Not required.
- If the snapshot's shape changes, bump `v` and keep the viewer reading old versions: links already sent must open.
- **Verified end to end on the Firestore emulator with the repo's real rules** (Java 21 is at `/opt/homebrew/opt/openjdk@21`;
  setup in `docs/testing-sign-in.md`): create through the real route and the real Report page, the stored document
  has exactly `uid, iv, ct, createdAt, expiresAt` and no plaintext, a recipient opens it with no sign-in, stop and
  "stop all" delete the documents, a stopped link says so, deleting an account removes its links and leaves other
  people's, and as a signed-in user the browser is refused (403) on `shares`, `programmeCounts`, `partnerEnquiries`
  and other people's documents. On production only the read path was exercised (a missing address answers 404 from a
  real Firestore read, and every write route answers 401 without a sign-in). A live create is a good final check
  (`docs/deploy-checklist.md` section 6) but no longer the first time this code has met a real database.

**Anonymous monthly headcount** (`lib/programme-count*.ts`, `app/api/programme/count`, `headcount-choice.tsx`,
`/partners/report/{key}`):
- Offered only for a programme whose register entry has `report: { keyHash }` (and the sample, which stores nothing).
  The person sees an **unticked** box with its meaning written out, when joining and in Settings. If ticked, once a
  month when the dashboard opens, the device sends the programme code, signed in only so a script cannot fake
  counts; the server adds one to `programmeCounts/{code}.active.{yyyy-mm}` (month in IST, chosen by the server).
  **No uid, no timestamp and no list is ever stored or logged with it.** The store has two methods,
  `increment(code, month)` and `read(code)`, and `programme-count-service.test.ts` fails if that changes.
- The organisation reads a private page (`/partners/report/{key}`; the register keeps only the key's SHA-256;
  `node scripts/make-report-key.mjs` makes the pair). It shows six months: a figure only when at least `MIN_GROUP`
  (20) people are counted, rounded to the nearest `ROUND_TO` (5), otherwise "fewer than 20". Monthly, never live.
  `/partners/report/example` is the same page with invented figures and a notice that says so.
- Double counting (one person who joined on two devices) and undercounting (people who do not tick) are accepted and
  said so on the report. Simulated: the figure is too high by about the share of people on two devices (1% of people
  on two devices is about 1% too high). Removing it would need a per-person record, which the promise forbids, so it
  stays. Also accepted: an organisation that made many accounts could pad a small total past 20; the threshold
  protects people from casual identification, not from a determined insider. A person who unticks, leaves, or whose organisation stops offering it sends nothing further; counts
  already added cannot be taken back and identify nobody.

**Anonymous progress figures** (`lib/progress-figures.ts`, `lib/programme-outcomes.ts`, the second box in
`headcount-choice.tsx`, the table on `/partners/report/{key}`):
- Offered only where the register entry has `figures: true` and `report`, and only to someone who is counted and
  ticks a second box (off by default; unticking the count unticks it). Once a month, in the same signed-in tick as
  the count, the device works out two numbers from the person's own records for the previous calendar month
  (`buildProgressFigures`: the percentage of days with no drink, and whether they drank less than the month before,
  left out when there is nothing to compare), and only if the records cover at least 7 days of that month. The server
  takes them only if they are exactly last month's and well-formed (`cleanFigures`) and adds them into running sums
  `programmeOutcomes/{code}.months.{yyyy-mm}` = `{ n, freePctSum, lessOf, lessN }` (`CountStore.addFigures`).
  **No uid, no timestamp and no per-person row is stored.** The person's records are never sent.
- Shown only when at least `MIN_GROUP` (20) people have shared, rounded to the nearest 5, capped at 100, each figure
  hidden separately (`displayOutcomes`). Self-reported, and the report says so. These are the "outcome statistics
  for funders". The nearest safe thing to a live counter is the current month's headcount row, which moves as people
  tick but is thresholded and rounded, plus the workspace's live count of who is sharing.

**Team workspace** (`lib/workspace*.ts`, `app/api/workspace/*`, `components/workspace-share.tsx` on `/report`,
`components/workspace-team.tsx` at `/partners/workspace/{key}`, `/partners/workspace/example`):
- **Who may have one: a clinic or community service only** (`WORKSPACE_KINDS`). For a workplace or a college
  `workspaceKeyFor` and `workspaceTeamFor` return nothing, the team page 404s (`proxy.ts`) and nobody is offered it,
  whatever the register says; `programme-register.test.ts` and `proxy.test.ts` pin that. Insurers and TPAs are not a
  kind at all. A register entry needs `report` and `workspace: {}`; people are offered it only once the team's
  public key is in the entry (`workspace: { publicKey }`).
- **Keys.** The team makes an RSA-OAEP-2048 pair **in its own browser** on its workspace page and locks the private
  half with a passphrase it chooses (PBKDF2-SHA-256, 600,000 rounds). Only the locked key is kept (browser storage
  and a key file the team saves). The **public** key is emailed to the owner, who pastes it into the register: that is
  the trust anchor, so someone who got hold of the team's report link can list scrambled copies but cannot swap in a
  key of their own. The test refuses a key with any private part. **Recoverly never has the private key or the
  passphrase and cannot recover either**; the page says so. A lost key means registering a new one and people share again.
- **What the person sends**: the same kind of snapshot as a summary link (`buildSnapshot`), only what they tick and a
  name they type, hybrid-encrypted on their device (a fresh AES-256-GCM key wrapped with the team's RSA public key).
  They tick "I understand" and press Start sharing; the card shows the team's key fingerprint (`keyIdOf`, the same text
  the server makes in `workspaceKeyId`, pinned by a test). One stored copy per person per team in the server-only
  collection `workspaceCopies` (`uid, code, keyId, iv, ct, wk, createdAt, updatedAt, expiresAt`), replaced in place by
  "Send an update". **Nothing is sent in the background**; a copy ends 30 days after the last send; "Stop sharing"
  deletes it; **leaving the programme stops it first and refuses to leave if it could not**; **deleting the account
  deletes it** (`/api/account`); a changed team key leaves old copies unreadable and the person is told. What they last
  chose (name, sections) is kept on their device only, so an update does not blank their name, and is forgotten on
  stop, leave and account deletion (`lib/workspace-prefs.ts`).
- **What the team gets** (`GET /api/workspace/inbox`, the report key in an `Authorization` header, never the address):
  scrambled copies with opaque ids and times, **no uid, account or email**. It opens them with its unlocked key in the
  page, re-cleaned (`sanitiseSnapshot`) and shown as plain text. The board shows live counts of who is sharing, who
  updated in the last 7 days and whose copy ends within 7. The sample programme is a practice workspace: the same flow
  with a key made on the spot, and the server stores nothing.
- **Verified end to end on the emulators with the repo's real rules**: the key made in a real browser, registered, a
  person ticking and sharing, the stored document has exactly nine fields and no plaintext, the team's wrong passphrase
  is refused, the right one opens it and shows exactly the ticked sections, an update replaces the same document,
  Stop and Leave delete it (Leave refuses when the delete fails), a practice send stores nothing, no sign-in gets 401, a
  wrong team link gets 404, and every browser read, list, write and delete of `workspaceCopies` is 403.
- **The remaining risk is the organisation, not the code.** A clinic's staff can read what people chose to send them,
  print it or pass it on, and nothing can take that back; the screen and the policy say so. If a clinic's patients
  could be pressured to share (a court-ordered programme, a clinic that makes it a condition of treatment), the consent
  is not free: say so when setting an organisation up, and decline it.

**Never, whatever the consent:** a list of who was counted or who joined; a count or average shown below 20; any
individual-level data to an **employer, college, insurer, TPA or government body** (consent given to your own
employer, institution or insurer is not freely given; the workspace is refused for those kinds in code and a test pins
it); a view a team has that the person did not send; anything sent to a team in the background; a team being able to
tell who is behind a name beyond what the person typed; the team's private key or passphrase, or the key of a summary
link, stored anywhere on a server. Each would need the owner's explicit decision and a rewritten policy first.

## The logo and icons

The mark is a white "R" with a small amber dot on a diagonal green-to-blue gradient. The master
is `public/icon.svg`; everything else is made from it by **`python3 scripts/build-icons.py`**
(needs `rsvg-convert`; it rewrites `favicon.ico`, `icon-192.png`, `icon-512.png`,
`apple-icon.png` and `icon-maskable-512.png`, and its header says what differs between them).
Elsewhere in the code the mark is drawn inline: `components/logo.tsx` for the header, and
inside `app/opengraph-image.tsx` for the share card, whose renderer cannot load a file.
Those two are copies of the master's paths; change all three together.

- After changing the mark, **bump `VERSION` in `public/sw.js`**: installed copies cache the
  old icons until it changes. Then look at the 16 px favicon, where a mark stops being
  readable first.
- Where the icons are declared: `icons` in `app/layout.tsx`, `app/manifest.ts`, and `logo`
  in `components/structured-data.tsx`.

## Sign-in: the behaviour that looks like a bug

Firebase treats an email/password account whose address was never confirmed as
*untrusted*, and Google sign-in as *trusted*. With "one account per email" (the
default), the first time such a person uses **Sign in with Google** on the same
address, Google's sign-in **replaces** the password: same uid, same data, but email
sign-in now fails with `auth/invalid-credential` and sign-up fails with
`auth/email-already-in-use`. Email-enumeration protection is on, so Firebase gives
that same code for a wrong password and for an unknown address — the app cannot tell
which, and must not pretend to.

What the app does about it (do not remove any of these):
- `src/lib/auth-errors.ts` maps each Firebase code to a translated message that names
  the ways out (Google button, "Forgot password?", create an account).
- **Forgot password?** on `/login` (`sendPasswordResetEmail`). Completing a reset puts a
  password back *and* confirms the address, after which Google links instead of
  replacing. The confirmation text is deliberately conditional ("if there is an
  account…") — never confirm that an address is registered.
- **Confirm your email** in Settings (`EmailVerification`). Opt-in, not automatic at
  sign-up: an email from a recovery app landing in a shared inbox is the user's choice.
- New passwords need 8+ characters; the sign-in form has **no** minimum, or existing
  shorter passwords would be locked out.

To check a real account, look at the Providers column in Firebase console →
Authentication → Users. Do **not** "test" by signing in with Google — that is the
action that removes the password. `docs/testing-sign-in.md` shows how to exercise all
of this against the Auth emulator.

## Known build failure: Google Fonts 404 on Vercel

`src/app/layout.tsx` loads seven Noto Sans Indic families via `next/font/google`,
which fetches the font files at build time. Google rotates those `fonts.gstatic.com`
URLs, and Vercel restores a build cache that can still hold the old ones — so a
build fails with `status 404 when requesting …notosanstamil…woff2` even though the
same commit builds locally (a local `.next` gets re-fetched).

It is a stale cache, not a code fault. Rebuild without the cache:

```bash
npx vercel --prod --force        # or: Vercel dashboard -> Redeploy, untick "Use existing Build Cache"
```

One clean build repopulates the cache with working URLs, and subsequent pushes are
fine. If it starts recurring often, move the Indic fonts to `next/font/local` and
commit the woff2 files so the build stops depending on Google at all.

## Development

```bash
npm install            # uses legacy-peer-deps (already set in .npmrc)
npm run dev            # local dev
npm run build          # production build (must stay green)
npm start              # run the production build
npm run lint
```

Requires `.env.local` (copy from `.env.example`):
`NEXT_PUBLIC_FIREBASE_*`, `GROQ_API_KEY`, and server admin creds
`FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`.
The app builds and renders without these, but auth and the AI coach are inert until set.

## FIRM PROJECT RULES (safety — non-negotiable)

1. **No medical advice.** The AI coach must never give medical advice or claim to
   diagnose, treat, or cure addiction. It points users to qualified professionals.
2. **Crisis = real help, not the bot.** On any mention of self-harm, suicide, or being
   in crisis, respond with care and surface a **real helpline** — never try to handle it
   alone. India defaults: **Tele-MANAS 14416** (or 1-800-891-4416) and emergency **112**.
   (Localise if the user is elsewhere.) **KIRAN (1800-599-0019) must not be printed**: it
   merged into Tele-MANAS in 2024 and the number is retired. `lib/safety.test.ts` fails if
   it returns to any source file. A retired number on a crisis screen is a safety bug: the
   person may not get through at the one moment it matters.
3. **Sudden-stop warning.** Warn that quitting alcohol suddenly can be medically
   dangerous for heavy drinkers (withdrawal seizures / delirium tremens) and advise
   seeing a doctor before stopping. Never cheer someone into cold-turkey quitting.
4. **Privacy first.** One user's personal data must never be visible to anyone else, **except what that
   person chooses to share, in exactly four ways, each of which they can see and undo** (owner's decisions,
   13 Nov 2026): (a) a **summary link** they make for their own clinician, counsellor or someone they
   trust: encrypted on their own device so Recoverly cannot read it, only what they tick, never their email
   or account, 1, 7 or 30 days, stoppable at any time, deleted with their account; (b) an **anonymous
   monthly headcount** for their programme, only if the organisation offers it and the person ticks a box
   that is off by default: a number, never a list, shown to the organisation only when at least 20 people
   are counted, rounded to the nearest 5; (c) two **anonymous progress figures** (the share of last
   month's days with no drink, and whether they drank less than the month before), added into group
   averages the same way, only if the person is counted and ticks a second box that is off by default,
   shown only for groups of 20 or more, rounded to the nearest 5; and (d) a **team workspace at a clinic or
   community service only**, where the person shares their own summary by name with that team, encrypted on
   their device so only the team's own private key opens it, only what they tick, never their email or
   account, only after they tick "I understand" and press Start sharing, readable for 30 days after they
   last sent it (nothing is sent in the background), stoppable at any time, and deleted when they leave the
   programme or delete their account. **No employer, college, insurer, TPA or government body ever
   receives individual-level data, with or without consent**: consent given to your own employer,
   institution or insurer is not freely given, so the workspace cannot be switched on for a workplace or a
   college (`workspaceAllowedFor`, pinned by tests) whatever the register says. Nothing else may make a
   person's data visible to anyone, and any change to these four needs the owner's decision and the
   privacy policy (`privacy.s12*` to `s15*`) changed first. See "Summary links, the headcount, progress
   figures and the team workspace" above.
   Enforce via Firebase Auth + Firestore `isOwner` rules; keep the OpenAI key server-side;
   apply the same per-user isolation to any ported breathalyser / Realtime-DB data.

## Behavioural design (from the original product brief)

No shaming language; encourage improvement; identity-based reinforcement; add friction
before logging a drink (the 5-second reconsideration delay); show progress even when small.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
