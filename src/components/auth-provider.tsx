"use client";

import {
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { authErrorCode } from "@/lib/auth-errors";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** Emails a link to set a new password. Resolves for unknown addresses too,
   *  so the caller must never say "sent" as if the address were confirmed. */
  resetPassword: (email: string) => Promise<void>;
  /** Emails the signed-in user a link that confirms their address. */
  sendVerificationEmail: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Rethrows after noting the failure in the console. Only the action and the
 * Firebase code are logged — never the address or the password — so there is
 * something to look at the next time a sign-in problem is reported, without
 * the console becoming a record of who tried to sign in.
 */
function report(action: string, error: unknown): never {
  // eslint-disable-next-line no-console
  console.warn(`[auth] ${action} failed:`, authErrorCode(error) || "unknown");
  throw error;
}

function requireAuth() {
  if (!auth) throw new Error("Firebase auth is not configured.");
  return auth;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { locale } = useI18n();

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      // eslint-disable-next-line no-console
      console.warn("[auth] Firebase client configuration is missing. Add NEXT_PUBLIC_FIREBASE_* variables.");
      return;
    }
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Firebase writes its emails (password reset, address confirmation) in this
  // language, so someone using the app in Tamil is not sent a link in English.
  useEffect(() => {
    if (auth) auth.languageCode = locale;
  }, [locale]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,

      signIn: async (email, password) => {
        try {
          await signInWithEmailAndPassword(requireAuth(), email, password);
        } catch (err) {
          report("sign-in", err);
        }
      },

      signUp: async (email, password) => {
        try {
          await createUserWithEmailAndPassword(requireAuth(), email, password);
        } catch (err) {
          report("sign-up", err);
        }
      },

      signInWithGoogle: async () => {
        try {
          await signInWithPopup(requireAuth(), googleProvider);
        } catch (err) {
          report("google sign-in", err);
        }
      },

      resetPassword: async (email) => {
        try {
          await sendPasswordResetEmail(requireAuth(), email);
        } catch (err) {
          report("password reset", err);
        }
      },

      sendVerificationEmail: async () => {
        try {
          const current = requireAuth().currentUser;
          if (!current) throw new Error("Not signed in.");
          await sendEmailVerification(current);
        } catch (err) {
          report("email verification", err);
        }
      },

      signOutUser: async () => {
        if (!auth) return;
        await signOut(auth);
      },

      getIdToken: async () => {
        if (!auth) return null;
        if (!auth.currentUser) return null;
        return auth.currentUser.getIdToken();
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider.");
  }
  return context;
}
