import type { Metadata } from "next";

import { ProgrammeReport } from "@/components/programme-report";
import { buildReportRows, monthKey, shiftMonth } from "@/lib/programme-count";
import { buildOutcomeRows } from "@/lib/programme-outcomes";

export const metadata: Metadata = {
  title: "Example monthly report",
  description: "What an organisation receives if its people choose to be counted: one anonymous number a month, shown only for groups of 20 or more.",
  alternates: { canonical: "https://recoverly.co.in/partners/report/example" }
};
export const dynamic = "force-dynamic";

/** Invented figures, oldest first, so the example shows both a hidden month and a shown one. */
const EXAMPLE_COUNTS = [12, 18, 23, 31, 38, 44];

/** Invented sums for the progress table, oldest first: people sharing, their percentages added up, people compared, people who drank less. */
const EXAMPLE_OUTCOMES = [
  { n: 9, avg: 58, lessOf: 6, lessN: 4 },
  { n: 14, avg: 61, lessOf: 11, lessN: 7 },
  { n: 21, avg: 63, lessOf: 17, lessN: 11 },
  { n: 26, avg: 66, lessOf: 22, lessN: 15 },
  { n: 33, avg: 69, lessOf: 28, lessN: 20 }
];

/** `/partners/report/example`: how an organisation's report looks, with made-up numbers and a notice that says so. */
export default function ExampleReportPage() {
  const now = new Date();
  const thisMonth = monthKey(now);
  const counts: Record<string, number> = {};
  EXAMPLE_COUNTS.forEach((people, i) => {
    counts[shiftMonth(thisMonth, i - (EXAMPLE_COUNTS.length - 1))] = people;
  });
  const lastMonth = shiftMonth(thisMonth, -1);
  const sums: Record<string, { n: number; freePctSum: number; lessOf: number; lessN: number }> = {};
  EXAMPLE_OUTCOMES.forEach((o, i) => {
    sums[shiftMonth(lastMonth, i - (EXAMPLE_OUTCOMES.length - 1))] = { n: o.n, freePctSum: o.n * o.avg, lessOf: o.lessOf, lessN: o.lessN };
  });
  return <ProgrammeReport name="Example organisation" rows={buildReportRows(counts, now)} outcomes={buildOutcomeRows(sums, now)} example />;
}
