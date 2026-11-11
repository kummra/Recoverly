import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Building2, GraduationCap, Handshake, Landmark, ShieldCheck, Stethoscope } from "lucide-react";

import { PartnerEnquiryForm } from "@/components/partner-enquiry-form";
import { CONTACT_EMAIL } from "@/lib/contact";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TITLE = "Pilot Recoverly with your organisation";
const DESCRIPTION =
  "Clinics, employers, colleges and NGOs: pilot a free, private, multilingual alcohol-recovery companion for the people you serve. Enquire about a pilot.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://recoverly.co.in/partners" },
  openGraph: {
    title: `${TITLE} · Recoverly`,
    description: DESCRIPTION,
    url: "https://recoverly.co.in/partners",
    siteName: "Recoverly",
    locale: "en_IN",
    type: "website"
  }
};

const TODAY = [
  "Private drink and craving tracking, with gentle insights and no shaming",
  "Craving SOS: an urge-surfing flow with breathing and one-tap helplines",
  "After a slip, a response that protects the progress already made",
  "Plans for hard moments, kept on the person's own device",
  "A self-check (the WHO AUDIT) and a summary they can print for their doctor",
  "An AI support companion they can speak to, in nine languages",
  "Guides in nine languages, each checked against WHO, NHS and Government of India sources"
];

const AUDIENCES = [
  {
    icon: Stethoscope,
    title: "Clinics, hospitals and de-addiction centres",
    body: "Help patients stay on track between visits. With a patient's consent, a progress summary could reach their care team. We would design a follow-up workspace with you."
  },
  {
    icon: Briefcase,
    title: "Employers and fleets",
    body: "An anonymous support benefit for staff and drivers, with awareness sessions for HR and managers. You would see anonymous totals only, never individuals."
  },
  {
    icon: GraduationCap,
    title: "Colleges and universities",
    body: "A student wellbeing offer and orientation sessions, in the languages your students speak."
  },
  {
    icon: ShieldCheck,
    title: "Insurers and TPAs",
    body: "Engagement and outcomes for members who choose to take part, measured with their consent."
  },
  {
    icon: Landmark,
    title: "NGOs, government and CSR programmes",
    body: "Deployment in nine languages, training for field workers, and honest impact reporting."
  }
];

const PROMISES = [
  "Free for individuals, always. The core app, the safety guidance and the support never sit behind a payment.",
  "No advertising and no selling of personal data.",
  "You never see an individual's information unless that person chooses to share it.",
  "Recoverly gives support and information, not medical advice. Helplines are always one tap away.",
  "Our guides are checked against WHO, NHS and Government of India sources. A clinician has not yet reviewed them, and we are looking for clinical advisers to do so."
];

const LINK =
  "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * For organisations. Written for the people who would sign a pilot, so it says
 * plainly what exists today and what would be built with them, and claims no
 * customers: the product is live and free, and has not launched commercially.
 */
export default function PartnersPage() {
  return (
    <div lang="en" className="animate-fade-in-up mx-auto max-w-3xl space-y-8">
      <header className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Building2 className="h-4 w-4" aria-hidden />
          For organisations
        </p>
        <h1 className="text-3xl font-bold leading-tight">Recoverly for organisations</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          A free, private, multilingual companion that helps people quit alcohol, and a way for the organisations that look after them to
          support it.
        </p>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-body">
          <p className="font-medium text-amber-800 dark:text-amber-300">Where we are</p>
          <p className="mt-1">
            Recoverly is built and live on the web, free for everyone. We have not launched commercially. We are opening a small number of pilot
            partnerships so the tools for organisations are shaped by the people who will use them.
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">The problem</h2>
        <p className="leading-relaxed text-body">
          A 2018 national survey for the Government of India found that more than 5.7 crore people (57 million) need help for their drinking.
          Very few reach a clinic. Stigma, cost, distance and language stand in the way, and most digital health tools are English only.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What people get today, free</h2>
        <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-body">
          {TODAY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          You can try all of it yourself: <Link href="/guide" className={LINK}>how it works</Link>, the{" "}
          <Link href="/learn" className={LINK}>guides</Link>, or <Link href="/login?mode=signup" className={LINK}>create a free account</Link>.
        </p>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">What a pilot would explore</h2>
          <p className="text-sm text-muted-foreground">
            This is what we would build and test together. These are not products you can buy today.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {AUDIENCES.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start gap-2 text-base">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">{body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How we would work with you</h2>
        <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed text-body">
          <li>You tell us who you serve and what you would like to try.</li>
          <li>We agree the privacy terms first: what is shared, with whose consent, and what is never shared.</li>
          <li>We run a small pilot and review what worked, together, before anything larger.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Handshake className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          What we promise
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-body">
          {PROMISES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="enquire" className="space-y-4 scroll-mt-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Start a conversation</h2>
          <p className="text-sm text-muted-foreground">
            Tell us a little about your organisation and we will reply by email. Or write to us directly at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <PartnerEnquiryForm />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
