import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Building2, FileText, Globe, Handshake, QrCode as QrIcon, Users } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { KitGenerator } from "@/components/kit-generator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT_EMAIL } from "@/lib/contact";

const TITLE = "Organisation toolkit";
const DESCRIPTION =
  "For clinics, employers, colleges and NGOs: a programme code with your name and support contacts, posters and pocket cards with a QR code in nine languages, and a session outline and manager guide.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://recoverly.co.in/partners/toolkit" },
  openGraph: {
    title: `${TITLE} · Recoverly`,
    description: DESCRIPTION,
    url: "https://recoverly.co.in/partners/toolkit",
    siteName: "Recoverly",
    locale: "en_IN",
    type: "website"
  }
};

const LINK =
  "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const EMBED_SNIPPET = `<iframe src="https://recoverly.co.in/embed/help?lang=en" title="Helplines for alcohol and mental health" width="100%" height="440" style="border:0;max-width:30rem" loading="lazy"></iframe>`;

const PROMISES = [
  "Your organisation cannot see who joins your programme, or anything anyone logs. People use a support tool that their employer or college cannot watch.",
  "If you ask for it, your organisation can also receive one anonymous number a month: how many people used Recoverly, out of those who chose to be counted. Each person ticks a box that stays off until they choose, and can untick it at any time. A figure is shown only when at least 20 people are counted, rounded to the nearest 5, and it is a number, never a list: we keep no names and cannot tell you who.",
  "Joining adds your name, a welcome in your words and the support contacts you choose to the person’s own screen, on their own device. Joining itself sends nothing about them back.",
  "Free for individuals, always. No advertising, no selling of data.",
  "Help is never behind a code: Tele-MANAS and emergency numbers are shown to everyone, and your contacts never replace them."
];

/**
 * The organisation toolkit: what a clinic, employer, college or NGO can use today
 * to put Recoverly in front of its people. Everything on it works now and none of it
 * needs a contract. It says plainly what an organisation does NOT get (any view of
 * its people), because that is both the promise to them and the reason they will
 * use it, and it claims no customers: the product has not launched commercially.
 */
export default function ToolkitPage() {
  return (
    <div lang="en" className="animate-fade-in-up mx-auto max-w-4xl space-y-10">
      <header className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Building2 className="h-4 w-4" aria-hidden />
          <Link href="/partners" className={LINK}>
            For organisations
          </Link>
        </p>
        <h1 className="text-3xl font-bold leading-tight">Organisation toolkit</h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
          Put Recoverly in front of the people you look after, with your name on it and your support contacts beside it, and run a session that leaves everyone knowing where to get
          help. Everything here works today. Recoverly is built and live and has not launched commercially, so these are tools for pilots, offered as they are.
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="programme">
        <h2 id="programme" className="flex items-center gap-2 text-xl font-semibold">
          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Your own programme code
        </h2>
        <p className="max-w-3xl leading-relaxed text-body">
          A programme is a short code that we set up with you. A person types it in Settings, or scans a QR code that opens <span className="font-mono text-sm">recoverly.co.in/join/YOURCODE</span>
          , and your organisation&rsquo;s name, a welcome in your own words and up to four support contacts appear on their dashboard (an employee assistance line, a counsellor, a
          clinic, a page). It is available in nine languages, and you can choose the language a first-time visitor sees.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-body">
          {PROMISES.map((promise) => (
            <li key={promise}>{promise}</li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">See one working:</span>
          <Link href="/join/SAMPLE" className={LINK}>
            open the sample programme
          </Link>
          <span className="text-muted-foreground">
            or enter <span className="font-mono">SAMPLE</span> under Programme code in Settings.
          </span>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          To get a code, write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
            {CONTACT_EMAIL}
          </a>{" "}
          or use the <Link href="/partners#enquire" className={LINK}>enquiry form</Link>. Say if you want the monthly headcount: it is off unless you ask, and nothing is counted for a
          programme without it. See an{" "}
          <Link href="/partners/report/example" className={LINK}>
            example of the monthly report
          </Link>{" "}
          (with invented figures). We never give an employer, college or insurer anything about an individual, with or without their consent. A clinic or community service can also ask for a private{" "}
          <Link href="/partners/workspace/example" className={LINK}>
            team workspace
          </Link>
          , which people choose to share into.
        </p>
      </section>

      <section className="space-y-4" aria-labelledby="posters">
        <h2 id="posters" className="flex items-center gap-2 text-xl font-semibold">
          <QrIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Posters and pocket cards
        </h2>
        <p className="max-w-3xl leading-relaxed text-body">
          Make an A4 poster or a sheet of pocket cards with a QR code, in any of our nine languages. Each carries the crisis line and the sudden-stop safety message. Put your
          organisation&rsquo;s name on it, and your programme code if you have one.
        </p>
        <KitGenerator />
        <p className="text-xs leading-relaxed text-subtle">
          The poster wording in the eight languages other than English was written for this app and has not yet been checked by native speakers. Have a speaker of the language read a
          poster before you print many copies.
        </p>
      </section>

      <section className="space-y-4" aria-labelledby="website">
        <h2 id="website" className="flex items-center gap-2 text-xl font-semibold">
          <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          On your website or in your app
        </h2>
        <p className="max-w-3xl leading-relaxed text-body">
          A help card for your own site or intranet, or data your own app can read. It shows the national mental-health helpline (Tele-MANAS) and the emergency number, with the
          sudden-stop safety message, in nine languages. We keep the numbers right, so when one changes yours is right the next time the page loads. It runs no script, sets no cookie
          and tracks nobody. Free while we are at the pilot stage: tell us where you use it, so we can tell you if anything changes.
        </p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Paste this into your page</h3>
              <CopyButton text={EMBED_SNIPPET} label="Copy the code" />
            </div>
            <pre className="overflow-x-auto rounded-xl border border-border bg-surface-muted p-3 text-xs leading-relaxed text-body">
              <code>{EMBED_SNIPPET}</code>
            </pre>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-body">
              <li>
                Change <span className="font-mono">lang</span> to <span className="font-mono">en hi mr pa ta te kn ml gu</span>, and add{" "}
                <span className="font-mono">&amp;theme=dark</span> for a dark page.
              </li>
              <li>
                Developers: <span className="font-mono">GET https://recoverly.co.in/api/helplines?lang=hi</span> returns the same information as JSON, with the date the numbers were last
                checked against official sources. If you call it from your own server, keep the answer for an hour.
              </li>
              <li>The card shows only the two national lines the app itself uses. We never add a number we have not checked.</li>
            </ul>
          </div>
          <iframe
            src="/embed/help"
            title="Preview of the help card"
            loading="lazy"
            className="h-[28rem] w-full max-w-sm rounded-xl border border-border bg-white"
          />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="sessions">
        <h2 id="sessions" className="flex items-center gap-2 text-xl font-semibold">
          <BookOpenCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          For the session
        </h2>
        <p className="max-w-3xl leading-relaxed text-body">
          Two printable documents for whoever runs the conversation. Neither adds health facts of its own: where a fact is needed, it comes from the app&rsquo;s safety wording or
          from our guides, which are checked against WHO, NHS and Government of India sources, and which a clinician has not yet reviewed.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-base">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <Link href="/partners/toolkit/session-outline" className={LINK}>
                  Session outline (45 minutes)
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed">
                For HR teams, college counsellors, clinic staff and field workers. Ground rules, what to cover and in what order, what to do if someone is unwell, and what not to do.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-base">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <Link href="/partners/toolkit/manager-guide" className={LINK}>
                  Manager conversation guide
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed">
                How to start a kind, practical conversation with a colleague you are worried about, without diagnosing, judging or promising what you cannot keep.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border p-5" aria-labelledby="clinics">
        <h2 id="clinics" className="flex items-center gap-2 text-xl font-semibold">
          <Handshake className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          For clinics and counsellors
        </h2>
        <p className="max-w-3xl leading-relaxed text-body">
          A patient can print a one-page summary of what they have logged (consumption, streaks, cravings, patterns, their own words and their AUDIT score) from the app&rsquo;s
          report page and bring it to an appointment. They can also make a link to a read-only copy and send it to you before a visit. It holds only what they tick, never their
          email or account, and it is encrypted on their own device, so Recoverly cannot read it either; it stops working after 1, 7 or 30 days, or sooner if they stop it. It is
          theirs to share. Pocket cards with your programme code are a simple way to hand the app to a patient between visits. A clinic or community service can also ask for a private{" "}
          <Link href="/partners/workspace/example" className={LINK}>
            team workspace
          </Link>
          , where a patient who chooses to can share their progress with your team by name. A clinic never sees a patient&rsquo;s progress unless the patient sends it. Print the{" "}
          <Link href="/partners/toolkit/clinic-handout" className={LINK}>
            patient handout
          </Link>{" "}
          to explain it.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border p-5" aria-labelledby="more-documents">
        <h2 id="more-documents" className="text-xl font-semibold">
          More documents and pages
        </h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["/partners/toolkit/campaigns", "Awareness campaign kit: calendar and ready WhatsApp messages"],
            ["/partners/toolkit/disclosure-protocol", "If someone tells you they have a drinking problem"],
            ["/partners/toolkit/help-a-friend", "Helping a friend who drinks too much (for students)"],
            ["/partners/toolkit/orientation", "College orientation outline and peer-ambassador pack"],
            ["/partners/toolkit/clinic-handout", "Patient handout for clinics"],
            ["/partners/pilot", "Pilot kit: proposal, success measures, case study"],
            ["/partners/faq", "Questions organisations ask"],
            ["/partners/compliance", "Compliance checklist"],
            ["/trust", "Trust and security"],
            ["/partners/regional", "Regional partners"]
          ].map(([href, label]) => (
            <li key={href}>
              <Link href={href} className={LINK}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
