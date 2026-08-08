"use client";

import { ShieldCheck } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  { titleKey: "privacy.s1Title", bodyKey: "privacy.s1Body" },
  { titleKey: "privacy.s2Title", bodyKey: "privacy.s2Body" },
  { titleKey: "privacy.s3Title", bodyKey: "privacy.s3Body" },
  { titleKey: "privacy.s4Title", bodyKey: "privacy.s4Body" },
  { titleKey: "privacy.s5Title", bodyKey: "privacy.s5Body" }
];

export function PrivacyContent() {
  const t = useT();
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          {t("privacy.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("legal.lastUpdated")}</p>
      </div>
      {SECTIONS.map((section) => (
        <Card key={section.titleKey}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t(section.titleKey)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-body">{t(section.bodyKey)}</p>
          </CardContent>
        </Card>
      ))}
      <p className="px-1 text-center text-xs text-subtle">{t("legal.englishGoverns")}</p>
    </div>
  );
}
