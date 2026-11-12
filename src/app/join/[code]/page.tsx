import type { Metadata } from "next";

import { JoinContent } from "@/components/join-content";

// A code is for the people it was given to, not for search results.
export const metadata: Metadata = {
  title: "Join a programme",
  robots: { index: false, follow: false }
};

type Params = Promise<{ code: string }>;

/** `/join/{code}`: the page a poster's QR code opens. See `components/join-content.tsx`. */
export default async function JoinPage({ params }: { params: Params }) {
  const { code } = await params;
  return <JoinContent rawCode={code} />;
}
