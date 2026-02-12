# Recoverly - Anti-Alcohol Recovery App

Production-ready Next.js 14 recovery platform with Firebase Auth + Firestore, protected tracking features, analytics, and AI guidance.

## Tech Stack

- Next.js 14 (App Router, Node runtime routes)
- React + TypeScript
- Tailwind CSS + shadcn-style UI primitives
- Firebase Authentication + Firestore
- OpenAI SDK (server-side key only)
- Recharts (records charts)
- Docker + Kubernetes manifests (Oracle Cloud compatible)

## Folder Structure

```txt
.
├── src
│   ├── app
│   │   ├── api/ai/route.ts
│   │   ├── ai/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── login/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── records/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── charts
│   │   │   ├── consumption-line.tsx
│   │   │   └── monthly-bar.tsx
│   │   ├── ui
│   │   ├── auth-provider.tsx
│   │   ├── log-drink-modal.tsx
│   │   ├── protected-route.tsx
│   │   └── top-nav.tsx
│   ├── hooks/use-auth.ts
│   └── lib
│       ├── analytics.ts
│       ├── firebase-admin.ts
│       ├── firebase.ts
│       ├── firestore.ts
│       ├── schemas.ts
│       └── utils.ts
├── k8s
│   ├── deployment.yaml
│   └── service.yaml
├── .env.example
├── firestore.rules
├── Dockerfile
└── README.md
```

## Features Implemented

- Recovery-focused home page with motivational language and monthly summary.
- Firebase email/password auth with protected routes for dashboard, records, AI, and settings.
- Dashboard drink logging modal with 5-second reconsideration delay.
- Firestore `users/{userId}/drinkRecords/{recordId}` storage.
- Records page:
  - current month total
  - daily average
  - previous month comparison
  - improvement percentage
  - 6-month projection
  - line/bar charts via Recharts
- Settings page:
  - account display
  - timezone display
  - weekly goal + reminder time persistence
  - safety disclaimers
- AI chat:
  - `/api/ai` server route (Node runtime)
  - Firebase token verification in API route
  - server-only OpenAI key usage
  - Firestore chat sessions/messages for memory/sidebar

## Environment Variables

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required vars:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `OPENAI_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Local Development

```bash
npm install
npm run dev
```

Production run locally:

```bash
npm run build
npm start
```

## Firebase Setup and Deployment

1. Create Firebase project.
2. Enable Authentication -> Email/Password provider.
3. Create Firestore database.
4. Add web app credentials to `.env.local`.
5. Create service account for server API route:
   - Generate private key JSON.
   - Map values to `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
6. Apply Firestore rules:

```bash
firebase deploy --only firestore:rules
```

## Vercel Deployment

1. Push repository to GitHub/GitLab.
2. Import project in Vercel.
3. Set all environment variables in Vercel dashboard.
4. Deploy using default commands:
   - Build: `npm run build`
   - Start: `npm start`

## Oracle Cloud Deployment (Docker + Kubernetes)

### Docker

```bash
docker build -t recoverly-web:latest .
docker run -p 3000:3000 --env-file .env.local recoverly-web:latest
```

### Kubernetes (OKE)

1. Push image to Oracle Container Registry.
2. Create Kubernetes secret `recoverly-secrets` with env vars.
3. Apply manifests:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

4. Verify rollout:

```bash
kubectl get pods
kubectl get svc recoverly-web
```

## Phase 2 Expo Roadmap (iOS/Android)

- Create `apps/mobile` using latest Expo SDK.
- Reuse Firebase Auth/Firestore schema unchanged.
- Keep AI backend at current Next.js `/api/ai`.
- Move shared domain logic (`schemas`, `analytics`) into a shared package.
- Use NativeWind tokens matching web Tailwind palette for consistent experience.
