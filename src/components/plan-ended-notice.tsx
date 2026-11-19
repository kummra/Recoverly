import Link from "next/link";

/**
 * Shown at an organisation's private report, workspace or roll-up address when the link is real but the
 * organisation has no active plan. Plain English like the rest of the organisation pages. Nothing is
 * deleted by a lapse, so the page says that, and what keeps working for the organisation's people.
 */
export function PlanEndedNotice({ name }: { name: string }) {
  return (
    <div lang="en" className="mx-auto max-w-xl space-y-3">
      <h1 className="text-xl font-semibold text-foreground">{name}: the plan has ended</h1>
      <p className="text-sm leading-relaxed text-body">This private address is real, but the organisation has no active plan, so the page is closed. Nothing has been deleted: it opens again as soon as the plan is renewed.</p>
      <p className="text-sm leading-relaxed text-body">
        People who already joined keep what is on their own devices, and the national helplines stay available to everyone. To renew, sign in to the{" "}
        <Link href="/portal" className="underline underline-offset-2 hover:text-foreground">
          organisation portal
        </Link>{" "}
        or{" "}
        <Link href="/partners" className="underline underline-offset-2 hover:text-foreground">
          get in touch
        </Link>
        .
      </p>
    </div>
  );
}
