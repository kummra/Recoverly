import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const hasFirebaseClientConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
);

const app = hasFirebaseClientConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;

export const auth: Auth | null = app ? getAuth(app) : null;

// Local testing only. Pointing sign-in at the Firebase Auth emulator lets the
// whole login flow be exercised with throwaway accounts that never leave this
// machine (see docs/testing-sign-in.md). The NODE_ENV check means a production
// build can never talk to an emulator, whatever the environment contains, and
// `emulatorConfig` keeps hot reloads from connecting twice.
const authEmulatorUrl = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
if (auth && authEmulatorUrl && process.env.NODE_ENV !== "production" && !auth.emulatorConfig) {
  connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
}
export const firestore: Firestore | null = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();
export const isFirebaseConfigured = hasFirebaseClientConfig;
