import type { Metadata } from "next";

import { LearnHub } from "@/components/learn-hub";
import { LearnHubStructuredData } from "@/components/structured-data";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { alternatesFor } from "@/lib/seo/alternates";

const t = createTranslator("en");

export const metadata: Metadata = {
  title: t("learn.hubTitle"),
  description: t("learn.hubIntro"),
  alternates: alternatesFor("en", "learn")
};

export default function LearnPage() {
  return (
    <>
      <LearnHubStructuredData locale="en" />
      <LearnHub locale="en" />
    </>
  );
}
