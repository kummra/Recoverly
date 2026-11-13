import type { Metadata } from "next";

import { ShareView } from "@/components/share-view";

// A summary link is for the person it was handed to, not for search results or other sites.
// `no-referrer` keeps even the address (which is half of what opens it) from travelling with a click.
export const metadata: Metadata = {
  title: "A shared summary",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer"
};

type Params = Promise<{ id: string }>;

/** `/share/{id}#{key}`: what a summary link opens. See `components/share-view.tsx` and `lib/share.ts`. */
export default async function SharePage({ params }: { params: Params }) {
  const { id } = await params;
  return <ShareView rawId={id} />;
}
