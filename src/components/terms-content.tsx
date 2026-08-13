import { FileText } from "lucide-react";
import { createTranslator } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  { titleKey: "terms.s1Title", bodyKey: "terms.s1Body" },
  { titleKey: "terms.s2Title", bodyKey: "terms.s2Body" },
  { titleKey: "terms.s3Title", bodyKey: "terms.s3Body" },
  { titleKey: "terms.s4Title", bodyKey: "terms.s4Body" },
  { titleKey: "terms.s5Title", bodyKey: "terms.s5Body" }
];

export function TermsContent({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <FileText className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          {t("terms.title")}
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
      {/* A translated legal page must say which version governs. */}
      <p className="px-1 text-center text-xs text-subtle">{t("legal.englishGoverns")}</p>
    </div>
  );
}
