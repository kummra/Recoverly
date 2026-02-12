import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  // Handle both JSON-escaped newlines and literal \n in env values
  let cleaned = key.replace(/\\n/g, "\n");
  // Strip surrounding quotes if the env var was double-quoted
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).replace(/\\n/g, "\n");
  }
  return cleaned;
}

function createAdminApp(): App | null {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey })
    });
  } catch {
    // eslint-disable-next-line no-console
    console.warn("Firebase Admin SDK failed to initialize. Server routes requiring admin will return errors at runtime.");
    return null;
  }
}

const adminApp = createAdminApp();

export const adminAuth: Auth | null = adminApp ? getAuth(adminApp) : null;
export const adminDb: Firestore | null = adminApp ? getFirestore(adminApp) : null;
export const isAdminConfigured = adminApp !== null;
