import type { Metadata } from "next";

import { DocLink, DocList, DocPara, DocSection, ToolkitDoc } from "@/components/toolkit-doc";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Organisation terms",
  description: "The plain-language terms for an organisation that uses a Recoverly plan: what you get, what you promise, what we promise, and what happens when a plan ends.",
  alternates: { canonical: "https://recoverly.co.in/partners/terms" }
};

const BACK = { href: "/pricing", label: "Back to plans and pricing" };

/**
 * A plain-words draft. It says up front that it has not been reviewed by a lawyer, because it has not, and it leaves the
 * operating entity's name and the points only a lawyer can settle (liability, governing law) marked as still to be done. The
 * privacy promises in it are the ones the software enforces (see CLAUDE.md "Summary links, the headcount, progress figures and
 * the team workspace"); they must not be weakened here without changing the code, the policy and CLAUDE.md first.
 */
export default function OrganisationTermsPage() {
  return (
    <ToolkitDoc
      kicker="Recoverly organisation terms · draft"
      title="Terms for organisations on a Recoverly plan"
      intro="These are the terms for an organisation that sets up an account in the organisation portal and chooses a plan. They are written in plain words. They are not for individuals: the app is free for individuals, always, and has its own terms."
      back={BACK}
      footerNote="This is a draft written in plain language. It has not been reviewed by a lawyer and is not yet a final contract. The operating entity's legal name and address, the limit of liability and the governing law will be settled with a lawyer and added before any plan is sold on these terms."
    >
      <div role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-body print:border-0">
        <p className="font-medium text-amber-800 dark:text-amber-300">Draft: read before you rely on it</p>
        <p className="mt-1">
          Recoverly is a new product. These terms describe how it works today. If you need a signed agreement, a data processing agreement or a different arrangement, write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>{" "}
          before you pay.
        </p>
      </div>

      <DocSection title="1. Who we are">
        <DocPara>
          Recoverly is run by its operator, whose legal name and address will be stated here before the first plan is sold. These terms are between that operator and the organisation that accepts them in the portal.
        </DocPara>
      </DocSection>

      <DocSection title="2. Your account">
        <DocList
          items={[
            "Your organisation account is attached to the Recoverly sign-in you used to create it. You must be authorised to act for the organisation, and what you tell us about it (its name and kind) must be true.",
            "Keep the sign-in safe. What is done with it is done in your organisation's name. Use an account you can hand over to a colleague if you leave.",
            "The kind of organisation you choose decides which plans fit and what can be switched on. We may check it, and we may ask for proof. If it is not true, we may close the account.",
          ]}
        />
      </DocSection>

      <DocSection title="3. The plans">
        <DocPara>
          What each plan includes is on the <DocLink href="/pricing">pricing page</DocLink>. We may add to a plan. We will not take away a feature you are paying for during a period you have already paid for; a change that removes something takes effect at your next renewal, and we will tell you before then.
        </DocPara>
      </DocSection>

      <DocSection title="4. What you write for your people">
        <DocList
          items={[
            "The name, welcome and support contacts you give for a programme are shown to every person who enters its code. They must be accurate, be yours (or your service's) to share, and be kind and plain. No medical advice, no claims of treatment or cure, and nothing that promotes drinking.",
            "We read every programme before it is shown, and again whenever you change its words, so that the numbers shown to people really are yours. Until we approve it, people see the last approved version, or nothing. We may refuse or take down any words, and we will tell you why.",
            "A support contact is shown beside Tele-MANAS and the emergency number, never instead of them.",
          ]}
        />
      </DocSection>

      <DocSection title="5. What we promise about your people's information, and what you promise">
        <DocList
          items={[
            "We never tell you who joined your programme, and you cannot see anything anyone logs. The only numbers you can receive are the anonymous ones a person has chosen to add: a monthly headcount, progress averages and a challenge count, each shown only for 20 or more people and rounded to the nearest 5.",
            "An employer, college or insurer can never receive information about an individual, on any plan, even if the person agrees. A clinic or community service may offer a private team workspace that people choose to share into, only after we have confirmed it is one.",
            "You must not make joining a programme, being counted or sharing into a workspace a condition of anyone's job, course, treatment or insurance, and you must not pressure anyone to do so, ask them whether they did, or try to work out who is in a count.",
            "If you offer a workspace, your team is responsible for its own passphrase. Nobody, including us, can recover a forgotten one.",
            "Recoverly is a support companion, not treatment or an emergency service. People in crisis are always pointed to Tele-MANAS (14416) and the emergency number (112).",
          ]}
        />
      </DocSection>

      <DocSection title="6. Paying">
        <DocList
          items={[
            "You can pay by card on Stripe's payment page, or by invoice, bank transfer or UPI if we agree it. We never see or keep your card details.",
            "A plan renews for the same period until you cancel it. The price is the one shown when you chose the plan. If we change a price, it applies from your next renewal, and we will tell you first.",
            "Taxes that apply are added or stated where the law requires.",
            "If a payment fails, access continues for a short grace period (up to 7 days past the end of the paid period) while you update your card, and then the plan ends.",
          ]}
        />
      </DocSection>

      <DocSection title="7. Cancelling and refunds">
        <DocPara>
          You can cancel at any time and the plan ends at the end of the period you have paid for. The rules for refunds are on the <DocLink href="/partners/refunds">cancellation and refund page</DocLink>.
        </DocPara>
      </DocSection>

      <DocSection title="8. When a plan ends">
        <DocList
          items={[
            "Your programme codes stop being found and your private report, workspace and roll-up pages close. Nothing is deleted. Everything opens again when a plan is active.",
            "People who already joined keep what is on their own devices, and the national helplines stay available to everyone.",
            "Copies that people shared into a workspace expire 30 days after they last sent them. They are not kept for you.",
            "You can ask us to close the organisation and delete its records at any time.",
          ]}
        />
      </DocSection>

      <DocSection title="9. The service as it is">
        <DocPara>
          We work to keep Recoverly available, but we do not promise it will never be interrupted or free of mistakes, and we cannot guarantee any outcome for any person. Recoverly has not yet been independently audited or penetration-tested (see <DocLink href="/trust">trust and security</DocLink>).
        </DocPara>
      </DocSection>

      <DocSection title="10. Points to be settled with a lawyer">
        <DocList
          items={[
            "The limit of our liability to you.",
            "The governing law and where disputes are heard.",
            "Our data protection roles under the DPDP Act, 2023, and a data processing agreement if you need one (an outline is on the trust page).",
          ]}
        />
      </DocSection>

      <DocSection title="11. Contact">
        <DocPara>
          Questions, a problem, or a request to close your account:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
          , or the form on the <DocLink href="/partners#enquire">organisations page</DocLink>.
        </DocPara>
      </DocSection>
    </ToolkitDoc>
  );
}
