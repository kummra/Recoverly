import type { ReactNode } from "react";
import Link from "next/link";

import { PrintButton } from "@/components/print-button";

const LINK = "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Links used inside the toolkit documents. */
export function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={LINK}>
      {children}
    </Link>
  );
}

/** A heading and its content, for the printable toolkit documents. */
export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 break-inside-avoid">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function DocList({ items, ordered = false }: { items: ReactNode[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`${ordered ? "list-decimal" : "list-disc"} space-y-1.5 pl-5 text-sm leading-relaxed text-body`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  );
}

/**
 * A printable document for the people who run sessions: facilitators, HR teams,
 * clinic staff. Plain, one column, no app chrome on paper (the global print
 * styles hide the header, footer and navigation). English only, like the pages
 * for organisations.
 */
export function ToolkitDoc({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div lang="en" className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/partners/toolkit" className={`${LINK} text-sm`}>
          Back to the toolkit
        </Link>
        <PrintButton />
      </div>
      <article className="space-y-6 rounded-2xl border border-border bg-card p-6 print:border-0 print:p-0">
        <header className="border-b border-border pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Recoverly organisation toolkit</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{intro}</p>
        </header>
        {children}
        <footer className="border-t border-border pt-4 text-xs leading-relaxed text-subtle">
          From Recoverly&rsquo;s organisation toolkit (recoverly.co.in/partners/toolkit). General guidance for people who run sessions. It is not medical, clinical
          or legal advice, and a clinician has not reviewed it. Recoverly is a support companion, not treatment.
        </footer>
      </article>
    </div>
  );
}
