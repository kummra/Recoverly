import type { Metadata } from "next";

import { OwnerContent } from "@/components/owner/owner-content";
import { ProtectedRoute } from "@/components/protected-route";

// For the owner only; the server answers 404 to anyone else. Nothing here for search engines.
export const metadata: Metadata = { title: "Owner", robots: { index: false, follow: false } };

export default function OwnerPage() {
  return (
    <div lang="en" className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold leading-tight">Owner</h1>
      <ProtectedRoute>
        <OwnerContent />
      </ProtectedRoute>
    </div>
  );
}
