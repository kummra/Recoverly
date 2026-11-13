import { PrintButton } from "@/components/print-button";
import { CONTACT_EMAIL } from "@/lib/contact";
import { MIN_GROUP, ROUND_TO, type ReportRow, monthLabel } from "@/lib/programme-count";

/**
 * An organisation's monthly report: the one thing Recoverly can tell it about its
 * people. A figure appears only when at least `MIN_GROUP` people are counted, and is
 * rounded to the nearest `ROUND_TO`; anything smaller is shown as "fewer than 20" and
 * nothing more. Written in English like the rest of the organisations' pages, and
 * says plainly what it does NOT show, because that limit is the promise that lets an
 * organisation's people say yes to being counted. See `lib/programme-count.ts`.
 *
 * Plain and server-rendered: no script, and nothing here knows a person.
 */
export function ProgrammeReport({ name, rows, example = false }: { name: string; rows: ReportRow[]; example?: boolean }) {
  return (
    <div lang="en" className="mx-auto max-w-3xl space-y-8">
      {example && (
        <p role="note" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-body">
          <strong>Example.</strong> The figures below are invented to show how a report looks. Recoverly is built and live and has not launched commercially, so this is not a real
          organisation.
        </p>
      )}

      <header className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">{name}: monthly report</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          How many people used Recoverly each month, out of those who chose to be counted. It is the only thing Recoverly can tell you about your people.
        </p>
      </header>

      <section aria-labelledby="figures" className="space-y-3">
        <h2 id="figures" className="text-lg font-semibold">
          People counted each month
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th scope="col" className="py-2 pr-4 font-medium">
                Month
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                People
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-4 text-body">{monthLabel(row.month)}</td>
                <td className="py-2 text-right font-medium tabular-nums">
                  {row.display.shown ? `about ${row.display.value}` : <span className="font-normal text-muted-foreground">fewer than {MIN_GROUP}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PrintButton label="Print or save as PDF" />
      </section>

      <section aria-labelledby="how" className="space-y-3 rounded-2xl border border-border p-5">
        <h2 id="how" className="text-lg font-semibold">
          How to read it
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-body">
          <li>Each person chooses to be counted, with a box that stays off until they tick it. People who do not tick it are not counted, so the real number of people using Recoverly is likely higher.</li>
          <li>A person is counted once a month, the first time they open Recoverly that month. Someone using two devices can be counted twice, so read the figures as approximate.</li>
          <li>
            A figure is shown only when at least {MIN_GROUP} people are counted, and it is rounded to the nearest {ROUND_TO}. A smaller group is never shown, so that no one can be picked out.
          </li>
          <li>The figures are monthly totals, never live, so you cannot see anyone join.</li>
          <li>
            We keep no names, no accounts and no list of who was counted, so we cannot give you one. You cannot see who joined, what anyone logs, or how anyone is doing, and no one is told that
            you asked.
          </li>
        </ul>
        <p className="text-xs leading-relaxed text-subtle">
          Questions about this report: <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>
        </p>
      </section>
    </div>
  );
}
