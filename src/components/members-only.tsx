import Link from "next/link";
import { Lock } from "lucide-react";

import { MemberAccess } from "@/components/member-access";
import { Card, CardContent } from "@/components/ui/card";

const LINK = "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * What a visitor sees at a members' page: what it is, why it is closed, and the way in. A page like this is
 * a door, not a wall: it tells the truth about what is behind it and sends the right person to the right place.
 * Anything that is about someone's safety is not behind a door at all.
 */
export function MembersOnly({ title, summary, path }: { title: string; summary: string; path: string }) {
  return (
    <div lang="en" className="mx-auto max-w-2xl space-y-6">
      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Recoverly organisation toolkit · for organisations with a plan</p>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
      </header>
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-body">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>This page is part of the toolkit for organisations with an active plan. If your organisation has one, sign in and it opens.</span>
          </p>
          <MemberAccess returnPath={path} />
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/pricing" className={LINK}>
              See the plans
            </Link>{" "}
            or{" "}
            <Link href="/portal" className={LINK}>
              open the organisation portal
            </Link>
            .
          </p>
        </CardContent>
      </Card>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Recoverly stays free for individuals, always: the app, the helplines and the guides are open to everyone, and so are the safety documents for managers and friends (
        <Link href="/partners/toolkit/disclosure-protocol" className={LINK}>
          what to do if someone tells you they are struggling
        </Link>
        ,{" "}
        <Link href="/partners/toolkit/help-a-friend" className={LINK}>
          how to help a friend
        </Link>
        ).
      </p>
    </div>
  );
}
