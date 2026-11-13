import type { Metadata } from "next";

import { ProgrammeReport } from "@/components/programme-report";
import { buildReportRows, monthKey, shiftMonth } from "@/lib/programme-count";

export const metadata: Metadata = {
  title: "Example monthly report",
  description: "What an organisation receives if its people choose to be counted: one anonymous number a month, shown only for groups of 20 or more.",
  alternates: { canonical: "https://recoverly.co.in/partners/report/example" }
};
export const dynamic = "force-dynamic";

/** Invented figures, oldest first, so the example shows both a hidden month and a shown one. */
const EXAMPLE_COUNTS = [12, 18, 23, 31, 38, 44];

/** `/partners/report/example`: how an organisation's report looks, with made-up numbers and a notice that says so. */
export default function ExampleReportPage() {
  const now = new Date();
  const thisMonth = monthKey(now);
  const counts: Record<string, number> = {};
  EXAMPLE_COUNTS.forEach((people, i) => {
    counts[shiftMonth(thisMonth, i - (EXAMPLE_COUNTS.length - 1))] = people;
  });
  return <ProgrammeReport name="Example organisation" rows={buildReportRows(counts, now)} example />;
}
