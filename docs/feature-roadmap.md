# Feature roadmap and business-model map

Written 12 November 2026, after the business model was set (free for individuals; paid by
organisations, professionals and programmes around them). The point of this page is to keep
two things connected: what the business says it will sell, and what the app can actually do
today. Nothing here is a forecast or a customer. Prices and volumes belong to the business
plan, not to this file.

## 1. Where the model meets the product

| Revenue line (business model) | What the app needs | Today |
|---|---|---|
| Clinics and hospitals (follow-up workspace) | A way for a patient to share progress with a named clinician, with consent | **Share link not built:** needs an owner decision (section 4). Built: the printable clinician summary, now with the patient's own notes and (if they choose) their plans; pocket cards with a programme code to hand a patient the app. |
| Employers, fleets, colleges (anonymous programme) | Programme codes; reports of anonymous totals only | **Programme codes built** (the organisation's name and support contacts on its people's dashboards; it is told nothing). **Totals not built:** same decision. Also built: posters and pocket cards with a QR code in nine languages, a 45-minute session outline, a manager conversation guide. |
| Insurers, TPAs | Measured outcomes with consent | Not built; needs pilots first |
| Government, NGOs, CSR | Reach in many languages; evidence | The nine-language app and guides are the product here. Read aloud widens reach. Posters and cards in all nine languages put it in front of field workers' audiences. Evidence needs the decision in section 4. |
| Licensing and the safety layer | Crisis detection and safety rules usable by others | **The helplines are packaged:** an embeddable help card and a JSON feed, in nine languages, always as current as the app (`/embed/help`, `/api/helplines`). Crisis-text detection (`detectCrisis`) is not offered as a service: a keyword net should not be sold as a clinical tool. |
| Peer circles, counselling, courses, coaching | People, moderation, payments | Not software work yet. A demand signal comes first. |
| Care connection, diagnostics listings | Verified professionals; a legal check on fee structure | Not built |
| Free users (the funnel) | Trust, reach, retention | The whole app. Privacy lock, read aloud and share serve this. |

## 2. Built in this round

| Feature | Why it earns its place | Where |
|---|---|---|
| **Coach failure handling** | The coach was down for an unknown time and showed one red line. Now it says busy or unavailable, keeps the typed message, and offers Try again, Craving SOS and the helplines. Long chats are trimmed to fit the provider's limit. | `lib/ai-errors.ts`, `lib/ai-context.ts`, `app/ai/page.tsx` |
| **Craving SOS from a link** | The installed app's "I'm struggling right now" shortcut opened the plain dashboard. | `components/craving-sos.tsx` |
| **For organisations page and enquiry form** | The funnel for every organisation line above, and the only way to learn what organisations will pay. Honest about being pilot-stage. | `app/partners`, `app/api/partners`, `lib/partners.ts` |
| **Privacy lock (PIN)** | Stigma and shared phones are real barriers, and the employer promise is "anonymous". | `lib/app-lock.ts`, `components/app-lock-provider.tsx`, `lock-screen.tsx`, `privacy-lock.tsx` |
| **Read aloud** | Many people find typing and reading long Indic text slow. Voice input existed; the answer could not be heard. | `lib/speech.ts`, `components/listen-button.tsx` |
| **Share** | WhatsApp is how things travel. A helpline page is the most useful thing to pass on. | `components/share-button.tsx` |

Smaller fixes found on the way: a failure creating a chat left the page stuck on "typing"; the
chat list had an uncaught error; the coach page's subtitle was English in every language; the
privacy policy's date was stale and it now covers organisation enquiries.

### Second round (12 November 2026)

| Feature | Why it earns its place | Where |
|---|---|---|
| **Logo and favicon** | The app had a typed letter and a default icon. One mark (a white "R" on the green-to-blue gradient, with a small amber dot) now serves the browser tab, the installed app, the share card and search results. | `public/icon.svg` and the PNG/ICO files beside it, `components/logo.tsx` |
| **Someone I can call** | In the worst minute the app offered a generic "text someone". Now one saved person gets a Call and a Text button on the craving screen. The number never leaves the device. | `lib/support-person.ts`, `components/support-person-editor.tsx`, `components/craving-sos.tsx` |
| **Weekly look-back** | A week is the unit that clinics, employers and families talk in. Shows alcohol-free days, drinks logged as check-ins and cravings that passed. Never scored, never red; a short history is counted honestly. | `lib/weekly-review.ts`, `components/weekly-review-card.tsx` |
| **"What would help you" survey** | The cheapest real evidence of demand for the services line. Says plainly that none of it exists yet. | `lib/feedback.ts`, `app/api/feedback/route.ts`, `components/feedback-card.tsx` |
| **Business contact address** | A person can now be told where to ask for a deletion. One constant, used on the organisations page, the privacy policy (`/privacy#contact`), the footer and the search-result markup. | `lib/contact.ts` |
| **KIRAN retired** | Its number was removed everywhere and a test now fails if it comes back. Tele-MANAS and 112 remain. | `lib/safety.ts`, `lib/safety.test.ts` |

### Third round (12 November 2026): tools for the organisations that would pay

Everything here works without showing an organisation anything about a person, so none of it needed
the decision in section 4.

| Feature | Why it earns its place | Where |
|---|---|---|
| **Programme codes** | The unit every organisation line shares: an employer, college, clinic, bank or telecom gets a code and a poster. A person enters it (or scans the QR code) and the organisation's name, welcome and up to four support contacts appear on their dashboard. The organisation is told nothing, which is also why people will use it. `SAMPLE` is a working demonstration. | `lib/programme*.ts`, `app/api/programme`, `/join/{code}`, `programme-card.tsx`, `programme-editor.tsx` |
| **Organisation toolkit** | The page a prospective client lands on and can use the same day. | `/partners/toolkit` |
| **Posters and pocket cards with a QR code** | A workshop, a clinic reception or a college notice board needs paper. Nine languages, crisis line and sudden-stop message on every poster, the programme code checked before it is printed. The QR encoder is written in the repo (no new dependency) and verified against macOS's own scanner. | `poster-sheet.tsx`, `kit-generator.tsx`, `lib/qr.ts`, `scripts/verify-qr.mjs` |
| **Session outline and manager guide** | A paid workshop (the services line) needs a facilitator's plan; an employer needs managers who know how to start the conversation. Neither adds health facts: they point to the sourced guides. | `/partners/toolkit/session-outline`, `/partners/toolkit/manager-guide` |
| **Help card and helplines feed** | The "safety layer" a bank, telecom or insurer can put in its own app without keeping the numbers current. A number that changes, as one national line's did in 2024, changes once. | `/embed/help`, `/api/helplines`, `lib/helplines*.ts` |
| **Enquiry alert** | A clinic that writes in should not wait days because nobody opened the Firebase console. One line to Slack or Discord, with no personal details in it. Needs `ENQUIRY_WEBHOOK_URL`. | `lib/notify.ts` |
| **Preparing for an appointment** | A patient who brings their own questions, and (if they choose) their plans, gives a clinician more than a table of numbers. Never saved or sent. | `app/report/page.tsx` |

**Nothing is deleted automatically.** The owner decided against a retention period. Organisation
enquiries and survey answers are kept until the person asks for deletion (survey answers also go
when the account is deleted). The privacy text says exactly that.

## 3. Capacity: the number to plan around

The coach model on this Groq account allows about 1,000 requests a day and 8,000 tokens a
minute (about 200,000 a day). A reply is a few hundred tokens, so the whole app can serve
roughly a hundred or two replies a day. One organisation pilot could use that in an afternoon.
Indian languages cost 2 to 4 times English in tokens (Punjabi is the heaviest). Before a pilot:
a paid plan, or a second provider as a fallback. If Gemini is considered, read its free-tier
data terms first: the conversations are about alcohol and mental health.

## 4. Decisions only the owner can make

1. **Consented sharing.** Firm rule 4 says one person's data is never visible to anyone else.
   A clinician share link, or programme codes with aggregate dashboards, would make data
   visible by the person's choice. Options: (a) keep rule 4 absolute and sell only education,
   workshops and licensing; (b) amend it to "never, unless the person explicitly shares it,
   revocably, with an expiry", then build the share link first (it is also the clinic funnel).
   Aggregate-only reporting for employers should have a minimum group size (for example 20)
   so no individual can be picked out.

   **What exists now, so the decision is smaller than it was:** programme codes are built and the
   organisation is told nothing. What stays unbuilt until you decide is only the two things that make
   data visible: (i) a **clinician share link**, which I would build as a read-only snapshot the
   patient creates, with an unguessable address, an expiry (for example seven days) and a revoke button,
   stored apart from the account and never containing free text such as plans; and (ii) an
   **aggregate programme report**, which I would build as a count of people who chose to take part and
   nothing else, shown only above a group size of 20, joined by an explicit opt-in sentence at the moment
   of joining and disclosed in the privacy policy. Neither would carry a name, an email or a log. Saying
   "yes, amend rule 4 to 'unless the person explicitly shares it, revocably, with an expiry'" is enough
   for me to build both.
2. ~~**A business contact address.**~~ **Decided 12 Nov 2026:** the address in `lib/contact.ts`
   is public, and the policy says it is for questions, not emergencies. Open follow-up: because
   nothing is deleted automatically, a deletion request must be answered by a person. Pick a
   reply time (for example 30 days), say it in the policy, and delete the document in the
   Firebase console (`partnerEnquiries`, or `users/{uid}/feedback`) when asked.
3. ~~**KIRAN.**~~ **Decided and done 12 Nov 2026:** removed everywhere. See "Second round".
4. **Translation review.** The strings added in both rounds were written carefully against the
   app's existing vocabulary but have not had a native-speaker review. The privacy-lock,
   privacy-policy and "someone I can call" wording are the ones that matter most.

## 5. Next, once those are decided

In rough order of benefit for risk:
1. ~~An alert for new organisation enquiries.~~ **Built:** set `ENQUIRY_WEBHOOK_URL` (a Slack or
   Discord webhook) in Vercel and it works; see `docs/deploy-checklist.md`. Survey answers still need
   someone to look in the Firebase console.
2. A local script that prints survey totals and anonymous app totals (sign-ups, check-ins)
   from the Admin SDK, so the pitch quotes real numbers. The survey is already collecting.
3. Consented clinician share link, if decision 1(b).
4. An aggregate-only programme report (counts of people who opted in, group size of at least 20),
   if decision 1(b). Programme codes themselves are built.
5. Partner attribution (`?ref=`) to count which organisation a sign-up came from.
6. Plans for a dated event (a wedding, a festival).
7. An installable-app prompt.
8. English-first guides for the organisation audiences (alcohol at work, drink-driving for
   fleets). Translations follow only after an independent review, as the Learn section says.
9. Consider adding the national de-addiction helpline 14446, which the guides already print,
   to the support page, the help card and the feed (not the crisis message: it is a counselling and
   referral line, not an emergency line, and its hours are not confirmed by an official source I could
   find on 12 Nov 2026; the Ministry of Social Justice and Empowerment runs it and the Department of
   Telecommunications allocated the number). It needs translated wording in nine languages.
10. An owner-only page to read and delete enquiries and survey answers, which would also make honouring
    a deletion request a two-minute job. It needs a decision on who may sign in as an administrator.
11. A "talk to {organisation}" line on the craving screen for people in a programme. Left out on purpose
    for now: anything added to that screen is safety-critical and the organisation's number is not
    verified by us.

## 6. Considered and left out

- **A paid tier for individuals:** the owner decided against it.
- **Deleting enquiries automatically after a fixed time (a Firestore TTL policy):** the owner
  decided against it on 12 Nov 2026. Do not add a `deleteAt` field without changing the
  privacy text, which now says data is kept until the person asks for deletion.
- **Advertising, affiliate links, selling data:** break the promise the whole model rests on.
- **Hardware (the breathalyser):** abandoned.
- **Streak leaderboards and loss-framed streaks:** conflict with the no-shaming rule.
- **An unmoderated peer chat:** a safety risk without people to moderate it.
- **Calling the AI "counselling":** firm rule 1 says it is not a counsellor or a therapist.
  The human programmes in the business model are where counselling belongs.
