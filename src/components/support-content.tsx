import { LifeBuoy, Phone, Globe, HeartPulse, Users } from "lucide-react";

import { createTranslator } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { WithdrawalWarning } from "@/components/safety-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HELPLINES } from "@/lib/safety";

const indiaHelplines = [
  {
    nameKey: "support.teleManasName",
    detailKey: "support.teleManasDetail",
    numbers: [HELPLINES.india.teleManas, HELPLINES.india.teleManasAlt]
  },
  {
    nameKey: "support.kiranName",
    detailKey: "support.kiranDetail",
    numbers: [HELPLINES.india.kiran]
  },
  {
    nameKey: "support.emergencyName",
    detailKey: "support.emergencyDetail",
    numbers: [HELPLINES.india.emergency]
  }
];

export function SupportContent({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <LifeBuoy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          {t("support.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("support.intro")}
        </p>
      </div>

      {/* Crisis — most important, shown first */}
      <Card className="border-sky-500/40 bg-sky-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-sky-700 dark:text-sky-300">
            <Phone className="h-4 w-4" />
            {t("support.crisisHeading")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {indiaHelplines.map((line) => (
            <div key={line.nameKey} className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">{t(line.nameKey)}</span>
              <span className="text-xs text-muted-foreground">{t(line.detailKey)}</span>
              <div className="mt-0.5 flex flex-wrap gap-2">
                {line.numbers.map((num) => (
                  <a
                    key={num}
                    href={`tel:${num.replace(/[^\d+]/g, "")}`}
                    className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-sm font-semibold text-sky-800 dark:text-sky-200 underline-offset-2 hover:bg-sky-500/25 hover:underline"
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
            <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("support.outsideIndia")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-body">
            {t("support.outsideIndiaBefore")}{" "}
            <a
              href={HELPLINES.internationalDirectoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 dark:text-emerald-300 underline underline-offset-2 hover:text-emerald-900 dark:hover:text-emerald-200"
            >
              findahelpline.com
            </a>
            {t("support.outsideIndiaAfter")}
          </p>
        </CardContent>
      </Card>

      {/* Withdrawal safety — firm project rule #3 */}
      <WithdrawalWarning />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("support.professionalHeading")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm leading-relaxed text-body">
            {t("support.professionalBody1")}
          </p>
          <p className="text-sm leading-relaxed text-body">
            {t("support.professionalBody2")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("support.leanOnHeading")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-body">
            {t("support.leanOnBody")}
          </p>
        </CardContent>
      </Card>

      <p className="px-1 text-center text-xs text-subtle">
        {t("support.footerNote")}
      </p>
    </div>
  );
}
