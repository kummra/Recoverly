# Deploy & auth verification checklist

The app's auth and AI features only work once Firebase + OpenAI are configured. This is
the list of things only you can do (they need your Firebase Console / Vercel access). Code
is done — this is configuration + verification.

## 1. Firebase Console
- [ ] **Authentication → Sign-in method:** enable the providers you use:
  - [ ] Email/Password
  - [ ] Google (optional)
  - [ ] Phone: leave **disabled**. The app no longer offers phone sign-in, and an enabled
        provider with no UI is still an open SMS endpoint someone else can run up a bill on.
- [ ] **Firestore Database:** created (production mode).
- [ ] **Service account:** Project Settings → Service Accounts → *Generate new private key*.
      Use it for the server env vars below. **Rotate the old key** that was sitting in the
      project folder, and delete that JSON file.

## 2. Deploy security rules
- [ ] Deploy Firestore rules so per-user isolation is actually enforced in production:
  ```bash
  firebase deploy --only firestore:rules
  ```
  (The rules live in `firestore.rules`; they restrict every read/write to the owning user.)

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)
Client (safe to expose, must be `NEXT_PUBLIC_`):
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

Server-only (never `NEXT_PUBLIC_`):
- [ ] `GROQ_API_KEY` (Groq Cloud key for the Qwen AI coach)
- [ ] *(optional)* `GROQ_MODEL` — overrides the default `qwen/qwen3.6-27b`.
      **Confirm the exact model id from the Groq console's Models page** — Groq rejects
      unknown ids, and the names there are specific.
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY` (paste with literal `\n` newlines, or wrapped in quotes — the
      admin init in `src/lib/firebase-admin.ts` handles both)

- [ ] *(optional)* `ENQUIRY_WEBHOOK_URL` — a Slack or Discord incoming-webhook address (https).
      When an organisation sends an enquiry, the team gets one line in that channel ("New
      organisation enquiry (Clinic…). Read and reply in the Firebase console…"). The line never
      contains the name, email, organisation or message. It is a secret (anyone with it can post to
      the channel), so set it here and nowhere else. If it is unset, nothing is sent and nothing
      breaks. To try it: submit the form on `/partners` once and look in the channel.

> Future (Block 4 — breathalyser): you'll also add `NEXT_PUBLIC_FIREBASE_DATABASE_URL`.

## 4. Smoke test the live site
- [ ] Sign up with a new email → land on `/dashboard`.
- [ ] Log a drink; confirm it appears in Records.
- [ ] Open **Our AI**, send a message, get a reply.
- [ ] **Safety check:** send a message like "I want to stop drinking today" → reply should
      caution against stopping abruptly and suggest seeing a doctor (no medical advice).
- [ ] **Crisis check:** send a message containing self-harm language → reply must include
      the helplines (Tele-MANAS 14416 / 1-800-891-4416, emergency 112 + findahelpline.com).
      KIRAN must **not** appear: it merged into Tele-MANAS in 2024.
- [ ] **Isolation check:** in a second browser/account, confirm you can NOT see the first
      account's records (different `uid`, blocked by Firestore rules).
- [ ] **Deletion check:** Settings → Delete account → confirm the account + data are gone
      and you're signed out.

## 5. After a deploy that touches organisation pages, headers or the help card
Only the help card (`/embed/help`) may be put in a frame by other sites; every other page must
still refuse. Check both, from any terminal:
```bash
# the help card: no X-Frame-Options trouble because its own policy says who may frame it
curl -sI "https://recoverly.co.in/embed/help?lang=hi" | grep -i -E "^(HTTP|content-security-policy)"
#   expect:  HTTP/2 200   and   content-security-policy: … frame-ancestors *
# an ordinary page: must still refuse framing
curl -sI "https://recoverly.co.in/" | grep -i -E "^(HTTP|x-frame-options)"
#   expect:  HTTP/2 200   and   x-frame-options: DENY
curl -s "https://recoverly.co.in/api/helplines?lang=en" | head -c 300     # the numbers, as JSON
curl -s -o /dev/null -w "%{http_code}\n" "https://recoverly.co.in/api/programme?code=SAMPLE"   # 200
```
- [ ] Open `https://recoverly.co.in/join/SAMPLE` on a phone: it shows the sample organisation and
      the privacy line. Create an account from it, and the dashboard asks once whether to join.
- [ ] Open `https://recoverly.co.in/partners/toolkit`, make a poster with the code `SAMPLE`, and
      scan the QR code on the printable page with a phone: it must open `/join/SAMPLE`.
      (`node scripts/verify-qr.mjs` proves the encoder on a Mac; this proves the whole chain.)

## Notes
- This local repo has **no git remote**. Confirm how Vercel builds (connected GitHub repo
  vs. CLI) and point it at this consolidated codebase before relying on the live site.
