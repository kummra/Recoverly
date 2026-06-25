# Recoverly — Anti-Alcohol Recovery App

A Next.js 16 (App Router) web app that helps people reduce and quit alcohol. It is one
part of a larger anti-addiction project being submitted for the **Pradhan Mantri
Rashtriya Bal Puraskar** (national youth award, India). **Deadline: 31 July 2026.**

Users may be vulnerable people in recovery, so **correctness and safety come before
features**. When in doubt, choose the safer, gentler behaviour.

Live deployment: https://recoverly-app.vercel.app

## Architecture

- **Framework:** Next.js 16 (App Router, Turbopack), React 18, TypeScript.
- **UI:** Tailwind CSS + shadcn-style primitives (Radix), Recharts, lucide-react.
- **Auth:** Firebase Authentication (email/password, Google, phone/OTP).
- **Data:** Cloud Firestore, written from the browser via the Firebase client SDK.
  - `users/{uid}` — `goalWeeklyMl`, `reminderTime`, `updatedAt`
  - `users/{uid}/drinkRecords/{id}` — `quantity` (ml), `type`, `mood?`, `createdAt`
  - `users/{uid}/aiChats/{chatId}/messages/{id}` — chat history
- **AI coach:** OpenAI (`gpt-4o-mini`) via the server route `src/app/api/ai/route.ts`.
  The OpenAI key is server-side only; every request verifies the caller's Firebase ID
  token and resolves a `uid`.
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
- Active work happens on a feature branch / worktree, then merges to `main` (Vercel
  builds `main`).

## Development

```bash
npm install            # uses legacy-peer-deps (already set in .npmrc)
npm run dev            # local dev
npm run build          # production build (must stay green)
npm start              # run the production build
npm run lint
```

Requires `.env.local` (copy from `.env.example`):
`NEXT_PUBLIC_FIREBASE_*`, `OPENAI_API_KEY`, and server admin creds
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
