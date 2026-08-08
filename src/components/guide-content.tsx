"use client";

import Link from "next/link";
import { Compass, UserPlus, Target, NotebookPen, LineChart, Bot, LifeBuoy } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  { icon: UserPlus, titleKey: "guide.step1Title", bodyKey: "guide.step1Body" },
  { icon: Target, titleKey: "guide.step2Title", bodyKey: "guide.step2Body" },
  { icon: NotebookPen, titleKey: "guide.step3Title", bodyKey: "guide.step3Body" },
  { icon: LineChart, titleKey: "guide.step4Title", bodyKey: "guide.step4Body" },
  { icon: Bot, titleKey: "guide.step5Title", bodyKey: "guide.step5Body" },
  { icon: LifeBuoy, titleKey: "guide.step6Title", bodyKey: "guide.step6Body" }
];

export function GuideContent() {
  const t = useT();
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          {t("guide.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("guide.intro")}
        </p>
      </div>

      <ol className="space-y-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.titleKey}>
              <Card>
                <CardContent className="flex gap-4 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{t(step.titleKey)}</h3>
                    <p className="text-sm leading-relaxed text-body">{t(step.bodyKey)}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button asChild>
          <Link href="/login">{t("guide.getStarted")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/support">{t("guide.needHelpNow")}</Link>
        </Button>
      </div>
    </div>
  );
}
