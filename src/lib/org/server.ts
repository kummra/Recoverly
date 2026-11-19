/**
 * The server-side wiring: the real Firestore store, and the directory, organisation service and billing
 * service built on it. Anything on the server that needs to look a programme up or touch an organisation goes
 * through here. When the Firebase Admin credentials are missing (a local run without them) there is no store:
 * the directory then answers from the in-code register alone and the portal routes say they are unavailable.
 */
import { createBillingService } from "@/lib/billing/service";
import { stripeConfigFromEnv } from "@/lib/billing/stripe";
import { adminDb } from "@/lib/firebase-admin";
import { createDirectory } from "@/lib/org/directory";
import { firestoreOrgStore } from "@/lib/org/firestore";
import { createOrgService } from "@/lib/org/service";
import { BASE_URL } from "@/lib/seo/alternates";

export const orgStore = adminDb ? firestoreOrgStore(adminDb) : null;

export const directory = createDirectory({ store: orgStore });

export const orgService = orgStore ? createOrgService({ store: orgStore }) : null;

/** Where Stripe sends people back to. The real site unless `SITE_URL` says otherwise (for a preview or a local test). */
export function siteUrl(): string {
  const value = process.env.SITE_URL?.trim();
  return value && /^https?:\/\/[^\s/]+$/.test(value) ? value : BASE_URL;
}

/** Built on each use so a change to the environment (a key added in Vercel) is picked up without code. */
export function billingService() {
  return orgStore ? createBillingService({ store: orgStore, stripe: stripeConfigFromEnv(), baseUrl: siteUrl() }) : null;
}
