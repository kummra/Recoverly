import { describe, expect, it } from "vitest";

import { authErrorCode, authErrorKey } from "@/lib/auth-errors";
import { en } from "@/lib/i18n/en";

const firebaseError = (code: string) => Object.assign(new Error(`Firebase: Error (${code}).`), { code });

describe("authErrorCode", () => {
  it("reads the code off a Firebase error and tolerates anything else", () => {
    expect(authErrorCode(firebaseError("auth/invalid-credential"))).toBe("auth/invalid-credential");
    expect(authErrorCode(new Error("boom"))).toBe("");
    expect(authErrorCode(null)).toBe("");
    expect(authErrorCode("auth/invalid-credential")).toBe("");
    expect(authErrorCode({ code: 42 })).toBe("");
  });
});

describe("authErrorKey", () => {
  it("gives a wrong password, an unknown address and a Google-only account the same answer", () => {
    // Enumeration protection means Firebase cannot tell us which it was, so
    // the one message has to cover all three — see the copy test below.
    for (const code of ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"]) {
      expect(authErrorKey("signIn", firebaseError(code))).toBe("login.errInvalidCredentials");
    }
  });

  it("tells someone signing up that the address is already registered", () => {
    expect(authErrorKey("signUp", firebaseError("auth/email-already-in-use"))).toBe("login.errEmailInUse");
  });

  it("explains a rejected new password", () => {
    expect(authErrorKey("signUp", firebaseError("auth/weak-password"))).toBe("login.errWeakPassword");
    expect(authErrorKey("signUp", firebaseError("auth/password-does-not-meet-requirements"))).toBe(
      "login.errWeakPassword"
    );
  });

  it("stays silent when the person closes the Google window themselves", () => {
    expect(authErrorKey("google", firebaseError("auth/popup-closed-by-user"))).toBeNull();
    expect(authErrorKey("google", firebaseError("auth/cancelled-popup-request"))).toBeNull();
  });

  it("names a blocked pop-up, which the person can fix", () => {
    expect(authErrorKey("google", firebaseError("auth/popup-blocked"))).toBe("login.errPopupBlocked");
  });

  it("never reveals whether an address has an account when resetting", () => {
    expect(authErrorKey("reset", firebaseError("auth/user-not-found"))).toBeNull();
  });

  it("handles the failures that are the same everywhere", () => {
    for (const action of ["signIn", "signUp", "google", "reset"] as const) {
      expect(authErrorKey(action, firebaseError("auth/network-request-failed"))).toBe("login.errNetwork");
      expect(authErrorKey(action, firebaseError("auth/too-many-requests"))).toBe("login.errTooMany");
    }
  });

  it("falls back to a message for the action, never to a raw Firebase string", () => {
    expect(authErrorKey("signIn", firebaseError("auth/something-new"))).toBe("login.authFailed");
    expect(authErrorKey("signUp", new Error("boom"))).toBe("login.signUpFailed");
    expect(authErrorKey("google", undefined)).toBe("login.googleFailed");
    expect(authErrorKey("reset", {})).toBe("login.resetFailed");
  });

  it("only ever returns keys that exist", () => {
    const codes = [
      "auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/missing-password",
      "auth/email-already-in-use", "auth/weak-password", "auth/password-does-not-meet-requirements",
      "auth/popup-blocked", "auth/account-exists-with-different-credential", "auth/invalid-email",
      "auth/missing-email", "auth/too-many-requests", "auth/network-request-failed", "auth/user-disabled",
      "auth/operation-not-allowed", "auth/web-storage-unsupported", "auth/unknown"
    ];
    for (const action of ["signIn", "signUp", "google", "reset"] as const) {
      for (const code of codes) {
        const key = authErrorKey(action, firebaseError(code));
        if (key !== null) expect(en[key], `${action} ${code} -> ${key}`).toBeTruthy();
      }
    }
  });
});

describe("sign-in failure copy", () => {
  it("offers both ways out of the dead end, because we cannot know which applies", () => {
    // Someone whose account has no password can re-type forever. The message
    // has to point at Google and at the reset link.
    expect(en["login.errInvalidCredentials"]).toMatch(/Google/);
    expect(en["login.errInvalidCredentials"]).toMatch(/forgot/i);
  });

  it("does not blame the reader", () => {
    for (const key of Object.keys(en).filter((k) => k.startsWith("login.err"))) {
      expect(en[key], key).not.toMatch(/\b(you failed|your fault|wrong(ly)?|invalid)\b/i);
    }
  });
});
