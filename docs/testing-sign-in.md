# Testing sign-in without touching real accounts

The sign-in screen can be exercised end to end against the **Firebase Auth emulator**.
Accounts created this way exist only in memory on your machine and disappear when the
emulator stops. No real address is emailed and nothing reaches the production project.

## Run it

Terminal 1 — the emulator (needs no login and no Java; any empty folder with this
`firebase.json` will do):

```json
{ "emulators": { "auth": { "host": "127.0.0.1", "port": 9099 }, "ui": { "enabled": false } } }
```

```bash
npx firebase-tools emulators:start --only auth --project demo-recoverly
```

The emulator files everything under the project named on its command line
(`demo-recoverly`), whatever project id the app is configured with.

Production has **email-enumeration protection** switched on, which changes the errors
Firebase returns. Switch it on in the emulator too, or you will be testing different
behaviour from what users get:

```bash
curl -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer owner" http://127.0.0.1:9099/emulator/v1/projects/demo-recoverly/config -d '{"emailPrivacyConfig":{"enableImprovedEmailPrivacy":true}}'
```

Terminal 2 — the app, pointed at the emulator:

```bash
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099 npm run dev
```

`src/lib/firebase.ts` ignores that variable in a production build, so it cannot leak
into a deploy.

The signed-in pages will show loading or permission errors in this mode: Firestore is
still the real one, and it correctly refuses the emulator's unsigned tokens. That is
expected. This setup is for the sign-in screen, not the dashboard.

## Throwaway test account

Use these on the emulator only. They are not real credentials for anything.

| Field    | Value                       |
| -------- | --------------------------- |
| Email    | `tester@example.com`        |
| Password | `emulator-only-Passw0rd`    |
| Password after a reset | `emulator-only-NewPassw0rd` |

## What to check

Reset and confirmation emails are not sent by the emulator. It prints the link in its
terminal and lists pending ones here:

```bash
curl http://127.0.0.1:9099/emulator/v1/projects/demo-recoverly/oobCodes
```

1. **Create account** with the test account, sign out, **Sign in** again.
2. **Wrong password** — the message must offer Google and "Forgot password?", not just
   say the details are incorrect.
3. **Create account with an address that already exists** — must say an account exists.
4. **Forgot password?** — request a link, open it from `oobCodes`, set a new password,
   sign in with it.
5. **The Google trap** (the reason email sign-in appeared broken): create an email
   account, sign out, use "Sign in with Google" with the *same* address in the
   emulator's fake Google window, sign out, then try the email and password. It is
   refused, because Google's sign-in replaced the unconfirmed password. "Forgot
   password?" must get the person back in.
6. Repeat step 5 after confirming the address from Settings → "Confirm your email".
   The password must now survive the Google sign-in.

## Why sign-in mode has no minimum length

New passwords must be at least 8 characters (`MIN_NEW_PASSWORD_LENGTH`). The sign-in
form deliberately has no minimum: an account created earlier with a 6-character
password must still be able to sign in.

## Testing the database side too (Firestore emulator and the real rules)

The Auth emulator alone leaves signed-in pages unable to read anything (the real Firestore refuses its
tokens). To test the whole thing locally, with the repo's real `firestore.rules`, add the Firestore
emulator. It needs **Java 21 or newer** (firebase-tools refuses older ones); on this Mac Homebrew's
`/opt/homebrew/opt/openjdk@21` is installed but not on the path.

```json
{ "emulators": { "auth": { "host": "127.0.0.1", "port": 9099 },
                 "firestore": { "host": "127.0.0.1", "port": 8080, "rules": "/ABSOLUTE/PATH/TO/firestore.rules" },
                 "ui": { "enabled": false } } }
```
```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH \
  npx firebase-tools emulators:start --only auth,firestore --project demo-recoverly
```

Then a temporary, gitignored `.env.development.local` points the browser **and** the server routes at the
emulators and keeps every other service away from production:

```
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_PROJECT_ID=demo-recoverly
FIREBASE_CLIENT_EMAIL=emulator@demo-recoverly.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...a throwaway key, see below...\n-----END PRIVATE KEY-----\n"
ORACLE_CONNECT_STRING=
ORACLE_USER=
ORACLE_PASSWORD=
```

The Admin SDK honours the two `*_EMULATOR_HOST` variables, so `/api/share`, `/api/programme/count`,
`/api/workspace/*` and `/api/account` run their real code against a real Firestore engine and verify emulator
tokens. Delete the file afterwards. Data seeded for a test lives only in the emulator's memory.

Gotchas, all met while testing:
- The Admin SDK checks that `FIREBASE_PRIVATE_KEY` is a well-formed PEM key, so a made-up string is refused (the
  routes answer 503). Make a throwaway one with `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048`,
  and write it on one line with `\n` for the newlines. It is never used to sign anything real.
- The browser's Firestore namespace is the app's own project id (`anti-alcohol-app`), the server's is
  `demo-recoverly`: seed both if a page must see seeded data.
- **Restart the dev server after editing `programme-register.ts`.** Pages pick the change up but a route handler
  can keep the module it first loaded, so `/api/programme` may keep answering from the old register.
- A script that talks to the emulator with the Admin SDK may sit for a minute probing the cloud metadata address;
  set `GCE_METADATA_HOST=127.0.0.1:1 METADATA_SERVER_DETECTION=none` to skip that.
- The team workspace was checked end to end this way: the team makes its key on `/partners/workspace/{key}` in a
  real browser, its public key goes into a temporary register entry (`kind: "clinic"`, `report`, `workspace`),
  a signed-in person joins it and shares from **Report**, and the stored `workspaceCopies` document is read back with
  the Admin SDK. The rules were checked with the emulator's REST interface: a signed-in browser's read, list, write
  and delete of `workspaceCopies` are all 403. Remove the temporary entry afterwards (never commit it).
