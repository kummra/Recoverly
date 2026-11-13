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

## 6. After a deploy that touches summary links or the monthly headcount
Read-only checks from any terminal (these write nothing):
```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://recoverly.co.in/api/share/AAAAAAAAAAAAAAAAAAAAAA"      # 404 (an address that never existed)
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://recoverly.co.in/api/share"                      # 401 (needs a signed-in person)
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://recoverly.co.in/api/programme/count"            # 401
curl -s -o /dev/null -w "%{http_code}\n" "https://recoverly.co.in/partners/report/example"                 # 200
curl -s "https://recoverly.co.in/partners/report/not-a-real-key-not-a-real-key" | grep -c "People counted"      # 0: the site's own not-found page (its status is 200 only because pages stream; it is noindex and shows nothing)
curl -sI "https://recoverly.co.in/share/AAAAAAAAAAAAAAAAAAAAAA" | grep -i -E "^(HTTP|x-frame-options|x-robots-tag)"      # 200, DENY
```
The create, open and stop flow, the stored document, deleting an account and the security rules were run end to end on
the Firestore emulator with the repo's real rules (`docs/testing-sign-in.md`). Production's read path is checked above.
A live create has not been run (it would write to the real database), so as a final confirmation
**do this once, as the owner, on your own account**:
- [ ] Sign in, open **Report**, tick a few things, **Create link**, copy it, open it in a private window
      (no sign-in): the summary shows, in the language you chose there, with no email or account name.
- [ ] Take the part after `#` off the address and reload: it says the link looks incomplete.
- [ ] Back in the app, **Stop sharing**, then reload the private window: it says the link has stopped.
- [ ] In the Firebase console, Firestore, `shares`: while a link is live you see one document with only
      `uid`, `iv`, `ct`, `createdAt`, `expiresAt` (nothing readable); after stopping it is gone.
- [ ] Optional: Firestore, Time to live, add a policy on collection `shares`, field `expiresAt`, so an
      expired copy is removed even if nobody asks for it.
- [ ] Settings, Programme code, `SAMPLE`: you are offered the unticked "count me" box; tick it, open
      the dashboard, and confirm nothing was written (Firestore `programmeCounts` stays empty: the sample stores nothing).
- To give a real organisation the monthly headcount: `node scripts/make-report-key.mjs`, paste the
  `report` line into its register entry, push, and send them the link it printed.

## 7. Progress figures and the team workspace
Read-only checks (these write nothing):
```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://recoverly.co.in/api/workspace/inbox"                     # 404 (no team link)
curl -s -o /dev/null -w "%{http_code}\n" "https://recoverly.co.in/api/workspace?code=SAMPLE"              # 401 (needs a signed-in person)
curl -s -o /dev/null -w "%{http_code}\n" -X PUT "https://recoverly.co.in/api/workspace/copy"             # 401
curl -s -o /dev/null -w "%{http_code}\n" "https://recoverly.co.in/partners/workspace/example"            # 200
curl -s -o /dev/null -w "%{http_code}\n" "https://recoverly.co.in/partners/workspace/not-a-real-key-not-a-real-key"   # 404 (a real 404, from the proxy)
```
The whole flow was run end to end on the Firestore emulator with the repo's real rules: a team making its key in a real
browser, a person sharing, the stored document (nine fields, no plaintext), the team opening it, update, stop, leave,
practice mode, and every browser read or write of `workspaceCopies` refused (403). A live run has not been done
(it would write to the real database), so as a final confirmation **do this once, as the owner, with a spare account**:
- [ ] Add a temporary clinic to the register (`kind: "clinic"`, a `report` line from `scripts/make-report-key.mjs`,
      `workspace: {}`, optionally `figures: true`), push, open `/partners/workspace/<link>`: it offers to make a key.
      Make it, save the key file, copy the public key, paste it into the entry as `workspace: { publicKey: {...} }`, push.
- [ ] As the spare account join that code, open **Report**: a "Share with the team" card shows the key ID, and Start
      sharing stays disabled until "I understand" is ticked. Share, then open the team page, unlock, and read it.
- [ ] Firestore, `workspaceCopies`: one document with only `uid, code, keyId, iv, ct, wk, createdAt, updatedAt, expiresAt`
      (nothing readable). Stop sharing: it is gone. Remove the temporary entry afterwards.
- [ ] Optional: a Firestore TTL policy on `workspaceCopies.expiresAt`, so an ended copy is removed even if nobody asks.

**To give a real clinic or community service a workspace** (never a workplace or a college: the code refuses):
1. `node scripts/make-report-key.mjs`; put its `report` line and `workspace: {}` in the entry; set `kind: "clinic"` or
   `"community"`; push; send the team its private link (it also opens the workspace page).
2. The team makes its key on that page (a passphrase of its choosing, which nobody can recover), saves the key file,
   and **emails you the public key block it shows**. Accept a key only from the team's own page or message.
3. Paste it as `workspace: { publicKey: { ... } }`, push (the tests refuse any private part), and read the key ID back
   to the team (the page shows it) so they know it is theirs. People in that programme are offered the workspace from
   that deploy.
4. If the team loses both passphrase and key file: register a new key. Copies made for the old key become unreadable
   and their senders are told; people share again.
Before enabling it, ask whether the people in that programme can freely say no to the clinic. If treatment, a court
order or anything else depends on sharing, decline.

## Notes
- This local repo has **no git remote**. Confirm how Vercel builds (connected GitHub repo
  vs. CLI) and point it at this consolidated codebase before relying on the live site.
