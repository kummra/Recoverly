import { notFound } from "next/navigation";

import { LocaleSync } from "@/components/locale-sync";
import { isLocale } from "@/lib/i18n/types";

/** Wraps every localised page so the shared chrome follows the URL's language. */
export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <>
      <LocaleSync locale={locale} />
      {children}
    </>
  );
}
