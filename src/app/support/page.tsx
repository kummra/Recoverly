import type { Metadata } from "next";
import { LifeBuoy, Phone, Globe, HeartPulse, ShieldAlert, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HELPLINES } from "@/lib/safety";

export const metadata: Metadata = {
  title: "Support & Helplines",
  description:
    "If you need help right now, you are not alone. Crisis helplines, withdrawal-safety guidance, and how to find professional support for alcohol recovery."
};

const indiaHelplines = [
  {
    name: "Tele-MANAS",
    detail: "24/7 national mental-health support",
    numbers: [HELPLINES.india.teleManas, HELPLINES.india.teleManasAlt]
  },
  {
    name: "KIRAN Helpline",
    detail: "24/7 mental-health rehabilitation",
    numbers: [HELPLINES.india.kiran]
  },
  {
    name: "Emergency services",
    detail: "If you or someone else is in immediate danger",
    numbers: [HELPLINES.india.emergency]
  }
];

export default function SupportPage() {
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <LifeBuoy className="h-5 w-5 text-emerald-400" />
          Support &amp; Helplines
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          If things feel heavy right now, reaching out is a sign of strength — not weakness. You don&apos;t have to do this alone.
        </p>
      </div>

      {/* Crisis — most important, shown first */}
      <Card className="border-sky-500/40 bg-sky-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-sky-300">
            <Phone className="h-4 w-4" />
            In crisis or thinking of self-harm? Call now (India)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {indiaHelplines.map((line) => (
            <div key={line.name} className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-white">{line.name}</span>
              <span className="text-xs text-slate-400">{line.detail}</span>
              <div className="mt-0.5 flex flex-wrap gap-2">
                {line.numbers.map((num) => (
                  <a
                    key={num}
                    href={`tel:${num.replace(/[^\d+]/g, "")}`}
                    className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-sm font-semibold text-sky-200 underline-offset-2 hover:bg-sky-500/25 hover:underline"
                  >
                    {num}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-emerald-400" />
            Outside India
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-300">
            You can find a free, confidential helpline in your country at{" "}
            <a
              href={HELPLINES.internationalDirectoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
            >
              findahelpline.com
            </a>
            . If you are in immediate danger, please call your local emergency number.
          </p>
        </CardContent>
      </Card>

      {/* Withdrawal safety — firm project rule #3 */}
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-amber-300">
            <ShieldAlert className="h-4 w-4" />
            Before you stop drinking — please read
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm leading-relaxed text-slate-300">
            If you drink heavily or every day, stopping suddenly can be{" "}
            <span className="font-semibold text-amber-200">medically dangerous</span> — abrupt withdrawal
            can cause seizures or delirium tremens, which can be life-threatening.
          </p>
          <p className="text-sm leading-relaxed text-slate-300">
            Please talk to a doctor before you quit, and only reduce or stop under medical supervision.
            Recoverly can support you alongside professional care, but it is never a substitute for it.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-emerald-400" />
            Finding professional help
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm leading-relaxed text-slate-300">
            A doctor, psychiatrist, or de-addiction specialist can assess your situation and build a safe,
            personalised plan. Government de-addiction centres and many NGOs offer this free of cost.
          </p>
          <p className="text-sm leading-relaxed text-slate-300">
            Tele-MANAS (above) can also connect you to qualified mental-health professionals near you.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-emerald-400" />
            Lean on people you trust
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-300">
            Telling one person you trust — a friend, family member, or colleague — makes a real difference.
            Recovery is easier when you&apos;re not carrying it alone.
          </p>
        </CardContent>
      </Card>

      <p className="px-1 text-center text-xs text-slate-500">
        Recoverly offers emotional support and motivation only — not medical advice, diagnosis, or treatment.
      </p>
    </div>
  );
}
