import type { Metadata } from "next";
import Link from "next/link";

import { PosterSheet } from "@/components/poster-sheet";
import { PrintButton } from "@/components/print-button";
import { findProgramme } from "@/lib/programme-register";
import { parsePosterSettings } from "@/lib/toolkit";

// Built from the address, for the person who made it. Nothing for search engines.
export const metadata: Metadata = {
  title: "Poster",
  robots: { index: false, follow: false }
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The printable page behind the form on /partners/toolkit. Rebuilt from the
 * address alone, on the server, so it prints the same without a script and can
 * be bookmarked. A code that is not in the register is dropped here too (the
 * form checks first, but an address can be typed or edited): a QR code to a page
 * that says "we do not recognise that code" must never reach a wall.
 */
export default async function PosterPage({ searchParams }: { searchParams: SearchParams }) {
  const requested = parsePosterSettings(await searchParams);
  const programme = requested.code ? findProgramme(requested.code) : null;
  const settings = { ...requested, code: programme ? programme.code : null };
  const rejected = requested.code !== null && programme === null;

  return (
    <div lang="en" className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/partners/toolkit" className="rounded text-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Back to the toolkit
        </Link>
        <PrintButton />
      </div>
      {rejected && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm leading-relaxed text-body print:hidden">
          We do not recognise the code &ldquo;{requested.code}&rdquo;, so this page has no code and its QR code opens Recoverly&rsquo;s home page. Go back, fix the code and open the
          page again before printing.
        </p>
      )}
      <PosterSheet settings={settings} />
    </div>
  );
}
