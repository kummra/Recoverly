import type { Metadata } from "next";
import Link from "next/link";
import { Compass, UserPlus, Target, NotebookPen, LineChart, Bot, LifeBuoy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "A simple, step-by-step guide to getting started with Recoverly — set a goal, log honestly, see your progress, and get support when you need it."
};

const steps = [
  {
    icon: UserPlus,
    title: "1. Create your account",
    body: "Sign up with email, Google, or your phone number. Your space is private and tied only to you."
  },
  {
    icon: Target,
    title: "2. Set a gentle weekly goal",
    body: "Choose a weekly limit that feels realistic. Small, sustainable change beats an all-or-nothing promise — and you can adjust it any time."
  },
  {
    icon: NotebookPen,
    title: "3. Log honestly",
    body: "Record each drink in a few taps. A short pause appears before you confirm — a few seconds to reconsider. There's no shame either way; honesty is what makes your progress real."
  },
  {
    icon: LineChart,
    title: "4. Watch your progress",
    body: "Your dashboard turns those logs into clear insights and trends — so you can see momentum building, even when the wins feel small."
  },
  {
    icon: Bot,
    title: "5. Talk to your AI companion",
    body: "Whenever you need a non-judgmental nudge, motivation, or someone to think things through with, the AI coach is there — emotional support, never medical advice."
  },
  {
    icon: LifeBuoy,
    title: "6. Get real help when you need it",
    body: "If things get hard, the Support page has crisis helplines and guidance on finding professional care. Quitting heavy drinking should always be done with a doctor."
  }
];

export default function GuidePage() {
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          How Recoverly works
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Six simple steps. Go at your own pace — every step toward awareness counts.
        </p>
      </div>

      <ol className="space-y-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <Card>
                <CardContent className="flex gap-4 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-body">{step.body}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button asChild>
          <Link href="/login">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/support">Need help now?</Link>
        </Button>
      </div>
    </div>
  );
}
