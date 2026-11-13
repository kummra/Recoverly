import { ShieldCheck } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/contact";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS: Array<{ titleKey: string; bodyKey: string; id?: string }> = [
  { titleKey: "privacy.s1Title", bodyKey: "privacy.s1Body" },
  { titleKey: "privacy.s2Title", bodyKey: "privacy.s2Body" },
  { titleKey: "privacy.s3Title", bodyKey: "privacy.s3Body" },
  { titleKey: "privacy.s4Title", bodyKey: "privacy.s4Body" },
  { titleKey: "privacy.s5Title", bodyKey: "privacy.s5Body" },
  { titleKey: "privacy.s6Title", bodyKey: "privacy.s6Body" },
  { titleKey: "privacy.s7Title", bodyKey: "privacy.s7Body" },
  { titleKey: "privacy.s10Title", bodyKey: "privacy.s10Body" },
  { titleKey: "privacy.s11Title", bodyKey: "privacy.s11Body" },
  { titleKey: "privacy.s12Title", bodyKey: "privacy.s12Body" },
  { titleKey: "privacy.s13Title", bodyKey: "privacy.s13Body" },
  { titleKey: "privacy.s8Title", bodyKey: "privacy.s8Body" },
  // The footer's Contact link lands here.
  { titleKey: "privacy.s9Title", bodyKey: "privacy.s9Body", id: "contact" }
];

/** A section's text, with `{email}` (only in the Contact section) as a mail link. */
function withEmail(text: string) {
  const [before, ...rest] = text.split("{email}");
  if (rest.length === 0) return text;
  return (
    <>
      {before}
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="font-medium text-foreground underline underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-300"
      >
        {CONTACT_EMAIL}
      </a>
      {rest.join("{email}")}
    </>
  );
}

export function PrivacyContent({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          {t("privacy.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("privacy.lastUpdated")}</p>
      </div>
      {SECTIONS.map((section) => (
        <Card key={section.titleKey} id={section.id} className={section.id ? "scroll-mt-6" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t(section.titleKey)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-body">{withEmail(t(section.bodyKey))}</p>
          </CardContent>
        </Card>
      ))}
      {/* A translated legal page must say which version governs. The English original is not a translation. */}
      {locale !== DEFAULT_LOCALE && <p className="px-1 text-center text-xs text-subtle">{t("legal.englishGoverns")}</p>}
    </div>
  );
}
