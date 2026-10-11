/**
 * Turns a Firebase Auth failure into something a person can act on.
 *
 * The sign-in screen used to answer every failure with one sentence —
 * "Authentication failed. Please verify your credentials" — which is the same
 * whether the password was mistyped, the account was created with Google and
 * has no password at all, or the network dropped. The second case is the trap:
 * no amount of re-typing fixes it, and nothing on the screen said so.
 *
 * Each function returns an i18n key, never English, so the message is shown in
 * the reader's language. `null` means "say nothing" (they closed the Google
 * window themselves — that is not an error).
 */

export type AuthAction = "signIn" | "signUp" | "google" | "reset";

/** Firebase errors carry a stable `code` such as "auth/invalid-credential". */
export function authErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "";
}

/** Failures that mean the same thing whatever the person was trying to do. */
const SHARED: Record<string, string> = {
  "auth/invalid-email": "login.errInvalidEmail",
  "auth/missing-email": "login.errInvalidEmail",
  "auth/too-many-requests": "login.errTooMany",
  "auth/network-request-failed": "login.errNetwork",
  "auth/user-disabled": "login.errDisabled",
  "auth/operation-not-allowed": "login.errUnavailable",
  "auth/web-storage-unsupported": "login.errStorage"
};

const BY_ACTION: Record<AuthAction, Record<string, string | null>> = {
  signIn: {
    // With email-enumeration protection on (it is, for this project) Firebase
    // returns invalid-credential for a wrong password, an unknown address AND
    // an address that only has Google sign-in. The older codes are kept in
    // case the protection is ever switched off.
    "auth/invalid-credential": "login.errInvalidCredentials",
    "auth/wrong-password": "login.errInvalidCredentials",
    "auth/user-not-found": "login.errInvalidCredentials",
    "auth/missing-password": "login.errInvalidCredentials"
  },
  signUp: {
    "auth/email-already-in-use": "login.errEmailInUse",
    "auth/weak-password": "login.errWeakPassword",
    "auth/missing-password": "login.errWeakPassword",
    "auth/password-does-not-meet-requirements": "login.errWeakPassword"
  },
  google: {
    // Closing the window is a choice, not a failure.
    "auth/popup-closed-by-user": null,
    "auth/cancelled-popup-request": null,
    "auth/user-cancelled": null,
    "auth/popup-blocked": "login.errPopupBlocked",
    "auth/account-exists-with-different-credential": "login.errEmailInUse"
  },
  reset: {
    // Never reveal whether an address has an account: an unknown address gets
    // the same "check your inbox" as a known one.
    "auth/user-not-found": null
  }
};

const FALLBACK: Record<AuthAction, string> = {
  signIn: "login.authFailed",
  signUp: "login.signUpFailed",
  google: "login.googleFailed",
  reset: "login.resetFailed"
};

export function authErrorKey(action: AuthAction, error: unknown): string | null {
  const code = authErrorCode(error);
  const specific = BY_ACTION[action];
  if (code in specific) return specific[code];
  return SHARED[code] ?? FALLBACK[action];
}

/** New passwords only. Sign-in must accept whatever an existing account has. */
export const MIN_NEW_PASSWORD_LENGTH = 8;
