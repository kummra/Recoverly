# Feature roadmap and business-model map

Written 12 November 2026, after the business model was set (free for individuals; paid by
organisations, professionals and programmes around them). The point of this page is to keep
two things connected: what the business says it will sell, and what the app can actually do
today. Nothing here is a forecast or a customer. Prices and volumes belong to the business
plan, not to this file.

## 1. Where the model meets the product

| Revenue line (business model) | What the app needs | Today |
|---|---|---|
| Clinics and hospitals (follow-up workspace) | A way for a patient to share progress with a named clinician, with consent | **Not built.** Needs an owner decision (section 4). The printable clinician summary exists. |
| Employers, fleets, colleges (anonymous programme) | Programme codes; reports of anonymous totals only | **Not built.** Same decision. A public page and enquiry form exist. |
| Insurers, TPAs | Measured outcomes with consent | Not built; needs pilots first |
| Government, NGOs, CSR | Reach in many languages; evidence | The nine-language app and guides are the product here. Read aloud widens reach. |
| Licensing and the safety layer | Crisis detection and safety rules usable by others | The logic exists in `lib/safety.ts`; not packaged |
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
1. An email alert for new organisation enquiries and survey answers. Today someone has to
   look in the Firebase console, so a clinic that writes in could wait days.
2. A local script that prints survey totals and anonymous app totals (sign-ups, check-ins)
   from the Admin SDK, so the pitch quotes real numbers. The survey is already collecting.
3. Consented clinician share link, if decision 1(b).
4. Programme codes and an aggregate-only report, if decision 1(b).
5. Partner attribution (`?ref=`) to count which organisation a sign-up came from.
6. Plans for a dated event (a wedding, a festival).
7. An installable-app prompt.
8. English-first guides for the organisation audiences (alcohol at work, drink-driving for
   fleets). Translations follow only after an independent review, as the Learn section says.
9. Consider adding the national de-addiction helpline 14446, which the guides already print,
   to the support page and the crisis message now that KIRAN is gone. Check the number
   against its official source first.

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
