import type { Metadata } from "next";

import { OfflineContent } from "@/components/offline-content";

export const metadata: Metadata = {
  title: "Offline",
  description: "You're offline. Recoverly will sync again once you reconnect."
};

export default function OfflinePage() {
  return <OfflineContent />;
}
