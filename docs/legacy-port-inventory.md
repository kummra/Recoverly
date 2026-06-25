# Legacy → Clean app: port inventory

Source of the legacy code: the original Cursor/Expo build, backed up at
`../Recoverly-legacy-backup-2026-06-26.zip` (and still present, untouched, in the parent
working folder). This document lists what is worth bringing into the clean app and what
to leave behind.

## ✅ Port (high value)

### Breathalyser (the Science & Technology centrepiece) — Block 4
The hardware path is: **ESP32 device (WiFi) → Firebase Realtime Database → web app
(realtime subscription)**, with device↔user linking.

| Legacy file | What it does | Notes for porting |
|---|---|---|
| `src/lib/rtdb.ts` | Reads readings from `/devices/{id}/tests` (`{ ppm, ts, dev }`), links/unlinks device to user, 20-month device lock, fire-and-forget Oracle sync | Solid. Drop the Oracle call if we don't keep Oracle (below). |
| `src/hooks/use-device.ts` | `useDevice()` hook: latest reading, ppm→status (SAFE/LOW/ALERT/HIGH), "online" detection (5-min), unlock-date logic | Clean, portable as-is. |
| `src/lib/firebase.ts` (database init) | Adds `getDatabase` behind `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Merge this one addition into the clean `firebase.ts`. |
| Dashboard `BreathalyzerSection` + Settings `BreathalyzerDeviceCard` | UI for live reading + device link/unlink | Rebuild against the clean app's design system rather than copy verbatim. |
| `database.rules.json` | Realtime DB security rules | **MUST harden before shipping — see security gaps.** |

### Environment variables to add
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (required for the breathalyser).

## 🔒 Security gaps to fix when porting (privacy rule #4)
- **Realtime DB rules are too loose.** In `database.rules.json`, `/devices/$id/userId`
  and `/devices/$id/tests/$testId` are writable by *any* authenticated user. That means
  any logged-in user could claim someone else's device or inject fake readings. Tighten
  so a device can only be claimed once / by an authorised path, and writes are restricted.
- **ppm vs BrAC.** Readings are stored as raw `ppm`. For technical credibility (and the
  award), add proper sensor **calibration** and a documented **ppm → BrAC** conversion,
  and label units correctly in the UI.

## 🤔 Decide later (optional)
| Legacy file | What it is | Recommendation |
|---|---|---|
| `src/app/api/oci-sync/route.ts`, `src/lib/oracle-storage.ts`, `src/lib/oracle-db.ts` | Dual-writes data to Oracle Cloud (no-ops if unconfigured) | Adds "Oracle Cloud" to the tech story but real complexity. Default: **skip for now**, revisit if the award framing needs it. |

## ❌ Leave behind (cruft)
- Expo / React Native shell: `App.tsx`, `app.json`, `metro.config.js`, `.expo/`,
  `nativewind`. (A real mobile app would be a separate, deliberate effort.)
- Firebase DataConnect + Genkit + HuggingFace + tsparticles + the ~80 unused shadcn
  components — none are needed by the clean app.
- Stray files: `src/app/dashboard/google5cd4881e39b007ef.html` (site-verification file in
  the wrong place), duplicate eslint configs.

## ❓ Not found anywhere (confirm with product owner)
- **"Smokes" / nicotine tracking** — no such feature exists in either codebase. If it's
  wanted, it's net-new (or it lives in a sibling app in the larger anti-addiction project).
