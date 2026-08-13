import { HelpCircle } from "lucide-react";

import { createTranslator } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Explicit key pairs, not template literals — the orphaned-key test scans for
 *  literal key strings, and generated keys would slip past it. */
const FAQ_ITEMS: Array<[string, string]> = [
  ["faq.q1", "faq.a1"],
  ["faq.q2", "faq.a2"],
  ["faq.q3", "faq.a3"],
  ["faq.q4", "faq.a4"],
  ["faq.q5", "faq.a5"],
  ["faq.q6", "faq.a6"],
  ["faq.q7", "faq.a7"],
  ["faq.q8", "faq.a8"],
  ["faq.q9", "faq.a9"]
];

export function FaqContent({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <HelpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          {t("faq.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("faq.intro")}
        </p>
      </div>

      {FAQ_ITEMS.map(([qKey, aKey]) => (
        <Card key={qKey}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t(qKey)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-body">{t(aKey)}</p>
          </CardContent>
        </Card>
      ))}

      <p className="px-1 text-center text-xs text-subtle">
        {t("faq.stillHaveQuestion")}{" "}
        <a href="/support" className="underline underline-offset-2 hover:text-foreground">
          {t("faq.supportPage")}
        </a>
        .
      </p>
    </div>
  );
}
