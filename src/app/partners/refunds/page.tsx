import type { Metadata } from "next";

import { DocLink, DocList, DocPara, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Cancellation and refunds",
  description: "How an organisation cancels a Recoverly plan and when it can have its money back.",
  alternates: { canonical: "https://recoverly.co.in/partners/refunds" }
};

const BACK = { href: "/pricing", label: "Back to plans and pricing" };

/** A draft policy for the owner to confirm. It says so on the page. Nothing here is a promise the payment code enforces: refunds are decided and made by a person, in Stripe or by bank transfer. */
export default function RefundsPage() {
  return (
    <ToolkitDoc
      kicker="Recoverly organisation terms · draft"
      title="Cancelling a plan and getting a refund"
      intro="Short and plain. This is for organisations on a paid plan. Individuals pay for nothing."
      back={BACK}
      footerNote="This is a draft policy. It has not been reviewed by a lawyer and the operator has not yet confirmed the refund periods below. It will be confirmed before the first plan is sold."
    >
      <div role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-body print:border-0">
        <p className="font-medium text-amber-800 dark:text-amber-300">Draft</p>
        <p className="mt-1">The periods below are our proposal and are still to be confirmed. If you need something different, ask before you pay.</p>
      </div>

      <DocSection title="Cancelling">
        <DocList
          items={[
            "Cancel any time, yourself, in Manage billing in the organisation portal. You do not have to ask us.",
            "A cancellation takes effect at the end of the period you have paid for. Until then everything keeps working, and the plan does not renew.",
            "If you pay by invoice, a plan ends on the date we agreed, and we do not renew it unless you ask us to.",
          ]}
        />
      </DocSection>

      <DocSection title="Refunds">
        <DocList
          items={[
            "A charge made by mistake, or twice, is refunded in full.",
            "In the first 7 days of a first payment, if no programme of yours has gone live, you can ask for a full refund.",
            "Otherwise, we do not refund the part of a period you have already paid for. You keep the plan until it ends.",
            "A one-off service, such as a workshop, can be cancelled for a full refund up to 7 days before the date we agreed. After that we refund what we can recover, and we are fair about it.",
            "If we could not provide what you paid for, we will refund the part you did not get.",
          ]}
        />
      </DocSection>

      <DocSection title="How to ask">
        <DocPara>
          Write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>{" "}
          from the address on your organisation account, or use the form on the <DocLink href="/partners#enquire">organisations page</DocLink>, and say what was charged and when. A refund goes back the way you paid, and your bank can take a few working days to show it.
        </DocPara>
      </DocSection>

      <DocSection title="When a plan ends">
        <DocPara>
          Your programme codes pause and your private pages close, and nothing is deleted. See section 8 of the <DocLink href="/partners/terms">organisation terms</DocLink>.
        </DocPara>
      </DocSection>
    </ToolkitDoc>
  );
}
