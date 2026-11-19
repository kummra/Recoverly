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

Organisation plans (section 9 says how to get each one):
- [ ] `SESSION_SECRET` — at least 32 random characters (`openssl rand -base64 48`). **Without it the paid toolkit pages stay
      closed for everyone**, by design.
- [ ] `OWNER_UIDS` — your Firebase uid (several: comma separated). Unset means nobody can open `/owner`.
- [ ] *(for card payments)* `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_CLINIC`, `STRIPE_PRICE_WORKPLACE`,
      `STRIPE_PRICE_NETWORK`, and optionally `STRIPE_PRICE_WORKSHOP`. Without them the portal says "ask us for an invoice".
- [ ] *(optional)* `SITE_URL` — only for a preview deployment, so Stripe returns people to that preview.
- [ ] *(for the monthly report email)* `CRON_SECRET` (at least 16 random characters: Vercel Cron sends it as `Authorization: Bearer ...` to
      `/api/cron/monthly-reports` on the 2nd of each month), `RESEND_API_KEY`, and `REPORTS_FROM_EMAIL` (an address on a domain you have verified in
      Resend, e.g. `Recoverly <reports@recoverly.co.in>`). Without all three the job does nothing and says so.

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

## 8. Round 6 options in the register
- `plans: [{ when, then }]` (up to 3) and `questions: ["..."]` (up to 3, for clinics with a workspace); plans need no report key.
- `challenge: true` (needs `report`): adds the optional dry-month tick and a table on the report; counts live in `programmeCounts/{CODE}:DRY`.
- `group: "Name"` on each district entry and `GROUPS: [{ name, keyHash }]` (make the key with `node scripts/make-report-key.mjs`): the
  roll-up is at `/partners/group/<key>`. Restart the dev server after any register edit.
- Read-only checks: `/trust`, `/partners/pilot`, `/partners/faq`, `/press`, `/accessibility`, `/.well-known/security.txt` all 200;
  `/partners/group/not-a-real-key-not-a-real-key` is a real 404.

## 9. Plans, the paywall and Stripe
Everything below is the **owner's** to do, in Vercel and Stripe's own dashboard. Never paste a key into chat or commit one.
The billing code has been tested with fakes and, for the webhook and the organisation database, against the Firebase
emulators with the repo's real rules; **it has not been run against Stripe's real API**, so do the test-mode run below first.

**Who holds the money (decide this first).** Stripe's payouts go to an Indian bank account in INR that the account holder
sets in Stripe's dashboard; **there is no payout to a phone number.** In India, new Stripe business accounts are by invitation
only (ask Stripe) and an individual cannot hold one; because the founder is a child, a parent or guardian or a registered
entity must be the account holder, and the contracting party in the organisation terms. Razorpay and Cashfree are open to
Indian businesses if Stripe is not available: the code keeps the provider behind `lib/billing/`, so adding one means a
second adapter, not a rewrite. Until an account exists, use the manual route below.

**The manual (invoice, bank transfer or UPI) route works today, with no Stripe account:**
1. Set `SESSION_SECRET` and `OWNER_UIDS` in Vercel and redeploy. (Sign in, open `/owner`: it shows your id if you are not yet on
   the list.)
2. The organisation signs in, opens `/portal`, creates its organisation and sees "Price on request"; it contacts you.
3. You invoice it, it pays, and in `/owner` you press **Switch the plan on by hand** with the plan, the end date and a note
   (invoice number). The plan ends on that date by itself; renew by doing it again.
4. It makes programmes in the portal; you read each one in `/owner` and **Approve** it (check that every number and link
   really is that organisation's). **Confirm the kind** of a clinic or community service only after checking, never an
   employer, a college or an insurer: that is what lets a team receive individuals' progress.

**Card payments, in test mode first:**
- [ ] In Stripe (test mode) make a Product for each plan with a **recurring monthly or yearly Price in INR**, and (optional) a
      one-time Price for the workshop. Put the Price ids (`price_...`) in `STRIPE_PRICE_CLINIC`, `STRIPE_PRICE_WORKPLACE`,
      `STRIPE_PRICE_NETWORK`, `STRIPE_PRICE_WORKSHOP`. The pricing page and portal read the amounts from Stripe (cached 10 minutes).
- [ ] Create a **restricted secret key** (Developers, API keys) that can write Checkout Sessions and Customer portal sessions and
      read Prices, Subscriptions and Customers, and put it in `STRIPE_SECRET_KEY`.
- [ ] Settings, Billing, **Customer portal**: switch it on; allow updating the payment method and cancelling (at period end);
      allow switching between the three plan prices if you want self-serve changes.
- [ ] Developers, Webhooks, add `https://recoverly.co.in/api/billing/webhook` for `checkout.session.completed`,
      `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`; copy its signing secret
      into `STRIPE_WEBHOOK_SECRET`. Redeploy.
- [ ] With a test organisation: **Subscribe with a card** (test card `4242 4242 4242 4242`), come back to `/portal` ("Payment
      received. Your plan is active."), open `/partners/toolkit/manager-guide` (it opens), then in Stripe cancel the subscription and
      watch `/portal` and the toolkit page close. Also try a failing card (`4000 0000 0000 0341`): the plan should show "payment late".
- [ ] Then switch to live keys and live Price ids, add the live webhook, and redo one real payment of the smallest plan yourself.

**Read-only checks after a deploy** (these write nothing):
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://recoverly.co.in/pricing                       # 200
curl -s -o /dev/null -w "%{http_code}\n" https://recoverly.co.in/portal                        # 200 (asks you to sign in)
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://recoverly.co.in/api/billing/webhook   # 400 (bad signature) or 503 (not set up)
curl -s -o /dev/null -w "%{http_code}\n" https://recoverly.co.in/api/owner                     # 401 (a signed-out caller)
curl -s https://recoverly.co.in/partners/toolkit/manager-guide | grep -c "organisations with a plan"   # the door, not the document
curl -s -o /dev/null -w "%{http_code}\n" https://recoverly.co.in/partners/toolkit/disclosure-protocol   # 200: the safety documents stay open
```
**The report email** (needs `CRON_SECRET`, `RESEND_API_KEY`, `REPORTS_FROM_EMAIL`; never run against Resend itself):
- [ ] Verify your sending domain in Resend, set the three variables, redeploy. In the portal switch on "Email me last month's figures" for
      a test organisation (it needs a confirmed sign-in address and a programme with its report on).
- [ ] Run it once by hand to see it work without waiting for the 2nd: `curl -s -H "Authorization: Bearer $CRON_SECRET" https://recoverly.co.in/api/cron/monthly-reports`
      answers counts only, e.g. `{"considered":1,"sent":1,"skipped":0,"failed":0}`. A second call the same month sends nothing (`skipped`).
      Without the secret it is a 401; with no email settings it says `{"skipped":"email is not set up"}`.
- [ ] Check the email: last month's rounded figure or "fewer than 20", no names, no private link (the link cannot be repeated).

**When the first real payment arrives:** change the "no paying customers" wording on `/press` and `/partners/faq`, and the
"has not launched commercially" wording wherever it appears, to say only what is then true. Never imply customers or revenue
that do not exist. Have a lawyer read `/partners/terms` and `/partners/refunds` (both say they are drafts) before the first
plan is sold, and put the operator's legal name and address in them.

## Notes
- This local repo has **no git remote**. Confirm how Vercel builds (connected GitHub repo
  vs. CLI) and point it at this consolidated codebase before relying on the live site.
