import type { Metadata } from "next";

import { OfflineContent } from "@/components/offline-content";

export const metadata: Metadata = {
  title: "Offline",
  // A PWA fallback shell, not a destination — keep it out of the index.
  robots: { index: false, follow: false },
  description: "You're offline. Recoverly will sync again once you reconnect."
};

export default function OfflinePage() {
  return <OfflineContent />;
}
