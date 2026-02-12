You are building a production-ready Anti-Alcohol Addiction, Recovery-based App. Build a real-time production-ready, modular app that is scalable and worth using for customers. It must run on iOS and Android using the latest Expo SDK. Implement end-to-end useful functionality and real logic to make the app useful and scalable.

TECH STACK:

Frontend:
- Next.js 14 (App Router)
- React
- Lucide React
- TypeScript
- Tailwind CSS
- NativeWind
- Zod
- Expo SDK
- shadcn/ui
- Recharts

Backend:
- Next.js API Routes
- Node runtime code
- React
- Firebase Authentication
- Firebase Firestore (database and deployment)
- Oracle Cloud
- Docker
- KubernetesA
- Vercel
- Github repos
- Gitlab repos
- OpenAI API in the .env file
- Zod
- Git
- Deployment-ready for Oracle Cloud (Node environment)

Note: Do NOT include "Vite" in this project—Next.js is the framework.

Environment Variables will be manually provided.
Do NOT hardcode keys, the API keys has to be put safely and securely in a .env file.


-----------------------------------
APP STRUCTURE AND FEATURE REQUIREMENTS 
-----------------------------------

Pages:

1) Home (/)
- Home screen that opens just when we open the app.
- Calm, emotional, and UI and UX enhanced to make the addict cling to the app and want to recover and use the app with good emotional motivation.
- Calm, minimal, recovery-focused design. 
- Display:
    - Quotes
    - Motivational slogans
    - Monthly consumption summary
    - Motivational copy
- Clean and emotionally attractive UI layout using Tailwind CSS.
- Subtle progress animations.

2) Settings (/)
Create a Settings page for authenticated users with the following sections:

**A. Profile & Preferences**
- Display user email/phone number (read-only).
- Preferred reminder time (HH:MM) and timezone display (read-only; use browser timezone).
- Weekly goal (ml) number input with validation:
  - min 0, max 5000 (configurable constant), default 0 (no goal)
- Save preferences to Firestore:
  - `users/{userId}` document fields:
    - `goalWeeklyMl: number`
    - `reminderTime?: string` (HH:MM)
    - `updatedAt: serverTimestamp`

**B. App & Safety**
- Show disclaimers:
  - “This app is not a substitute for professional medical advice.”
  - “If you feel in danger or at risk of self-harm, seek immediate help.”
- Link-style buttons:
  - “View Privacy Policy” (create `/privacy` static page)
  - “View Terms” (create `/terms` static page)

3) Dashboard (/dashboard)
- Large primary button: “Alcohol consum4d.”
- On click:
    - Show modal with:
        - Quantity (ml)
        - Drink type (beer, wine, whiskey, vodka, other)
- Add a 5-second reconsideration delay before submission.
- On submit:
    - Save to database under authenticated user
    - Collection structure:

users/{userId}/drinkRecords/{recordId}

Drink record structure:
{
  quantity: number,
  type: string,
  mood?: string,
  createdAt: timestamp
}

4) Records (/records)
- Fetch the authenticated user's drink records.
- Calculate:
    - Current month total
    - Daily average
    - Previous month comparison
    - scope of improvement in percentage
    - 6-month projection
- Display:
    - Text insights
    - Interactive Line graph (daily consumption)
    - Bar graph (monthly totals)
- Use Recharts.
- Clean responsive layout.
- Must be responsive and stable on empty data (show “No records yet”).


5) Our AI (/ai)
 Works on an OpenAI API key.

- Chat interface.
- Proper memory
- Sidebar showing previous chats
- Connect to OpenAI using API route: /api/ai
- Use server-side API key only.
- System role:

- Use latest OpenAI SDK.
- Add loading state.
- Add error handling.

-----------------------------------
AUTHENTICATION
-----------------------------------

Use Firebase Authentication:
- Email/Password login
- Protect dashboard, records, ai routes.
- Redirect unauthenticated users to login.

-----------------------------------
FIREBASE SETUP
-----------------------------------

Create:
- firebase.ts in lib/
- Initialize app using env variables.
- Export:
    - auth
    - firestore

Use Firestore and Firebase modular SDK (v9+).

-----------------------------------
BEHAVIORAL DESIGN RULES
-----------------------------------

- No shaming language.
- Encourage improvement.
- Identity-based reinforcement.
- Add friction before logging drink.
- Show progress even if small.

-----------------------------------
UI DESIGN
-----------------------------------

- Tailwind CSS
- Slate emmotional and relaxing and attractive UI background
- Rounded-2xl
- Smooth transitions
- Fully responsive

-----------------------------------
ORACLE CLOUD COMPATIBILITY
-----------------------------------

- Use standard Node runtime.
- Provide build instructions:
    npm run build
    npm start

-----------------------------------
OUTPUT FORMAT
-----------------------------------

Generate:
1. Full folder structure
2. All required files with full code
3. Firebase setup file
4. API routes
5. Authentication logic
6. Sample Firestore/Firebase security rules
7. Sample .env template
8. Local development instructions
9. Firebase Deployment steps
9. Oracle Cloud deployment steps

Do not leave placeholders or use placeholder logic; everything should be functional.
Do not skip logic.
Ensure all code compiles and is useful and logical.
Make it modular, scalable, secure, and production-ready.
