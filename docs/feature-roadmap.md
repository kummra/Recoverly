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
2. **A business contact address.** The privacy policy and the enquiry form name none, so a
   person cannot be told where to ask for deletion except by replying to the founder's own
   email. Choose one and put it in the policy.
3. **KIRAN.** It merged into Tele-MANAS in 2024. The app still prints it in `lib/safety.ts`
   and in the coach's crisis message, while the guides deliberately omit it.
4. **Translation review.** The strings added this round were written carefully against the
   app's existing vocabulary but have not had a native-speaker review. The privacy-lock and
   privacy-policy wording are the ones that matter most.

## 5. Next, once those are decided

In rough order of benefit for risk:
1. Enable the Firestore TTL policy on `partnerEnquiries.deleteAt` (privacy promise), and set up
   an email alert for new enquiries.
2. A short in-app "what would help you most" survey (counsellor, family group, courses,
   nothing) stored with the account and deleted with it. It is the cheapest evidence of
   demand for the services line. Say clearly that none of it exists yet.
3. Consented clinician share link, if decision 1(b).
4. Programme codes and an aggregate-only report, if decision 1(b).
5. Partner attribution (`?ref=`) to count which organisation a sign-up came from.
6. A weekly review card; plans for a dated event (a wedding, a festival).
7. An installable-app prompt.
8. English-first guides for the organisation audiences (alcohol at work, drink-driving for
   fleets). Translations follow only after an independent review, as the Learn section says.
9. A local script that prints anonymous totals (sign-ups, check-ins) from the Admin SDK, so
   the pitch quotes real numbers.

## 6. Considered and left out

- **A paid tier for individuals:** the owner decided against it.
- **Advertising, affiliate links, selling data:** break the promise the whole model rests on.
- **Hardware (the breathalyser):** abandoned.
- **Streak leaderboards and loss-framed streaks:** conflict with the no-shaming rule.
- **An unmoderated peer chat:** a safety risk without people to moderate it.
- **Calling the AI "counselling":** firm rule 1 says it is not a counsellor or a therapist.
  The human programmes in the business model are where counselling belongs.
