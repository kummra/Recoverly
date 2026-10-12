# Recoverly — Anti-Alcohol Recovery App

A Next.js 16 (App Router) web app that helps people reduce and quit alcohol. It is one
part of a larger anti-addiction project being submitted for the **Pradhan Mantri
Rashtriya Bal Puraskar** (national youth award, India). **Deadline: 15 August 2026.**

Users may be vulnerable people in recovery, so **correctness and safety come before
features**. When in doubt, choose the safer, gentler behaviour.

Live deployment: https://recoverly-app.vercel.app

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
- **AI coach:** a **Qwen** model on **Groq Cloud** (OpenAI-compatible API) in
  `src/app/api/ai/route.ts`. `GROQ_API_KEY` is server-side only and the model is overridable
  via `GROQ_MODEL`. Every request verifies the caller's Firebase ID token and resolves a `uid`.
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
   alone. India defaults: **Tele-MANAS 14416** (or 1-800-891-4416), **KIRAN
   1800-599-0019**, emergency **112**. (Localise if the user is elsewhere.)
3. **Sudden-stop warning.** Warn that quitting alcohol suddenly can be medically
   dangerous for heavy drinkers (withdrawal seizures / delirium tremens) and advise
   seeing a doctor before stopping. Never cheer someone into cold-turkey quitting.
4. **Privacy first.** One user's personal data must never be visible to anyone else.
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
