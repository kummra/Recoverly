"use client";

import {
  type ConfirmationResult,
  type User,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPhoneCode: (phoneNumber: string) => Promise<void>;
  confirmPhoneCode: (code: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Phone auth state stored in refs so the context value doesn't
  // trigger re-renders for intermediate phone-auth steps.
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      setError("Firebase client configuration is missing. Add NEXT_PUBLIC_FIREBASE_* variables.");
      return;
    }
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Lazily initialize the invisible reCAPTCHA verifier.
  const getRecaptchaVerifier = useCallback(() => {
    if (!auth) throw new Error("Firebase auth is not configured.");
    if (recaptchaRef.current) return recaptchaRef.current;

    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible"
    });
    return recaptchaRef.current;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      error,

      // ── Email / Password ──────────────────────────────────
      signIn: async (email, password) => {
        if (!auth) throw new Error("Firebase auth is not configured.");
        setError(null);
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unable to sign in.");
          throw err;
        }
      },

      signUp: async (email, password) => {
        if (!auth) throw new Error("Firebase auth is not configured.");
        setError(null);
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unable to sign up.");
          throw err;
        }
      },

      // ── Google ────────────────────────────────────────────
      signInWithGoogle: async () => {
        if (!auth) throw new Error("Firebase auth is not configured.");
        setError(null);
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Google sign-in failed.");
          throw err;
        }
      },

      // ── Phone ─────────────────────────────────────────────
      sendPhoneCode: async (phoneNumber: string) => {
        if (!auth) throw new Error("Firebase auth is not configured.");
        setError(null);
        try {
          const verifier = getRecaptchaVerifier();
          const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
          confirmationRef.current = result;
        } catch (err) {
          // Reset the reCAPTCHA so the user can retry.
          recaptchaRef.current = null;
          setError(err instanceof Error ? err.message : "Could not send verification code.");
          throw err;
        }
      },

      confirmPhoneCode: async (code: string) => {
        if (!confirmationRef.current) {
          const msg = "No pending verification. Please request a code first.";
          setError(msg);
          throw new Error(msg);
        }
        setError(null);
        try {
          await confirmationRef.current.confirm(code);
          confirmationRef.current = null;
        } catch (err) {
          setError(err instanceof Error ? err.message : "Invalid verification code.");
          throw err;
        }
      },

      // ── Common ────────────────────────────────────────────
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
    [error, loading, user, getRecaptchaVerifier]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Invisible reCAPTCHA anchor — must exist in the DOM for phone auth */}
      <div id="recaptcha-container" />
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider.");
  }
  return context;
}
