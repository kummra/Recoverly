"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LOCALES, LOCALE_ENGLISH_NAMES } from "@/lib/i18n/types";
import { checkProgrammeContent } from "@/lib/org/content";
import { PROGRAMME_LIMITS as L, type ProgrammeContent } from "@/lib/programme";

type ContactRow = { label: string; phone: string; email: string; url: string; hours: string };
type PlanRow = { when: string; then: string };
type ReferralRow = { name: string; place: string; phone: string; url: string; hours: string };

const emptyContact = (): ContactRow => ({ label: "", phone: "", email: "", url: "", hours: "" });
const emptyReferral = (): ReferralRow => ({ name: "", place: "", phone: "", url: "", hours: "" });
const pad = <T,>(items: T[], size: number, make: () => T): T[] => [...items, ...Array.from({ length: Math.max(0, size - items.length) }, make)].slice(0, size);

const SELECT_CLASS = "flex h-11 w-full rounded-2xl border border-input bg-surface-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SUMMARY = "cursor-pointer rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The words an organisation writes for its people: a name, a welcome, up to four support contacts, and (for a clinic)
 * ready-made plans and check-in questions. It checks as the person presses Save with the same rules the server uses
 * (`checkProgrammeContent`) and says exactly what is wrong. Saving sends the words for review: nobody is shown them
 * until they are approved.
 */
export function ContentForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  referralsAllowed = false
}: {
  initial?: ProgrammeContent;
  submitLabel: string;
  onSubmit: (content: ProgrammeContent) => Promise<string[] | null>;
  onCancel?: () => void;
  /** The plan includes the list of local referrals. */
  referralsAllowed?: boolean;
}) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [locale, setLocale] = useState<string>(initial?.locale ?? "");
  const [welcome, setWelcome] = useState<Record<string, string>>({ ...initial?.welcome });
  const [contacts, setContacts] = useState<ContactRow[]>(pad((initial?.contacts ?? []).map((c) => ({ label: c.label, phone: c.phone ?? "", email: c.email ?? "", url: c.url ?? "", hours: c.hours ?? "" })), L.contactsMax, emptyContact));
  const [plans, setPlans] = useState<PlanRow[]>(pad(initial?.plans ?? [], L.plansMax, () => ({ when: "", then: "" })));
  const [questions, setQuestions] = useState<string[]>(pad(initial?.questions ?? [], L.questionsMax, () => ""));
  const [referrals, setReferrals] = useState<ReferralRow[]>(pad((initial?.referrals ?? []).map((r) => ({ name: r.name, place: r.place ?? "", phone: r.phone ?? "", url: r.url ?? "", hours: r.hours ?? "" })), 1, emptyReferral));
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const setContact = (index: number, field: keyof ContactRow, value: string) => setContacts((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const check = checkProgrammeContent({ name, locale, welcome, contacts, plans, questions, referrals: referralsAllowed ? referrals : [] });
    if (!check.content) {
      setErrors(check.errors);
      return;
    }
    setErrors([]);
    setBusy(true);
    const problems = await onSubmit(check.content);
    setBusy(false);
    if (problems?.length) setErrors(problems);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-label="Programme words">
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>Programme name</Label>
        <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={L.nameMax + 20} placeholder="Acme Logistics, Pune depot" />
        <p className="text-xs text-muted-foreground">Shown to people who join. Use the name they know you by.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-welcome`}>Welcome, in English</Label>
        <Textarea id={`${id}-welcome`} value={welcome.en ?? ""} onChange={(e) => setWelcome((w) => ({ ...w, en: e.target.value }))} maxLength={L.welcomeMax + 50} rows={3} />
        <p className="text-xs text-muted-foreground">
          In your own words, up to {L.welcomeMax} characters. Kind and plain. Do not promise anything you cannot keep, and do not give medical advice.
        </p>
        <details className="rounded-xl border border-border p-3">
          <summary className={SUMMARY}>The welcome in other languages (optional)</summary>
          <div className="mt-3 space-y-3">
            {LOCALES.filter((locale) => locale !== "en").map((code) => (
              <div key={code} className="space-y-1">
                <Label htmlFor={`${id}-w-${code}`}>{LOCALE_ENGLISH_NAMES[code]}</Label>
                <Textarea id={`${id}-w-${code}`} lang={code} value={welcome[code] ?? ""} onChange={(e) => setWelcome((w) => ({ ...w, [code]: e.target.value }))} maxLength={L.welcomeMax + 50} rows={2} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">A person sees the welcome in their own language if you wrote one, and in English if you did not. Have a speaker of the language read it first.</p>
          </div>
        </details>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Support contacts (up to {L.contactsMax})</legend>
        <p className="text-xs text-muted-foreground">
          Who your people can call or write to: an employee assistance line, a counsellor, a clinic. They are shown beside Tele-MANAS and the emergency number, never instead of them. Check every number: we review
          them before anyone sees them.
        </p>
        {contacts.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor={`${id}-c${index}-label`}>Contact {index + 1}: what it is</Label>
              <Input id={`${id}-c${index}-label`} value={row.label} onChange={(e) => setContact(index, "label", e.target.value)} maxLength={L.labelMax + 20} placeholder="Employee assistance line" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-c${index}-phone`}>Phone</Label>
              <Input id={`${id}-c${index}-phone`} type="tel" value={row.phone} onChange={(e) => setContact(index, "phone", e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-c${index}-email`}>Email</Label>
              <Input id={`${id}-c${index}-email`} type="email" value={row.email} onChange={(e) => setContact(index, "email", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-c${index}-url`}>Web page (https)</Label>
              <Input id={`${id}-c${index}-url`} type="url" value={row.url} onChange={(e) => setContact(index, "url", e.target.value)} placeholder="https://" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-c${index}-hours`}>Hours</Label>
              <Input id={`${id}-c${index}-hours`} value={row.hours} onChange={(e) => setContact(index, "hours", e.target.value)} maxLength={L.hoursMax + 20} placeholder="Mon to Sat, 9 am to 6 pm" />
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Fill in a phone, an email or a page for each contact you use. Say &ldquo;24 hours&rdquo; only if it is true.</p>
      </fieldset>

      {referralsAllowed && (
        <details className="rounded-xl border border-border p-3" open={Boolean(initial?.referrals?.length)}>
          <summary className={SUMMARY}>Local referrals: places near your people (optional)</summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Up to {L.referralsMax} places or services you suggest: a government de-addiction centre, a counsellor, a meeting. They are shown beside your support contacts. Check that each one is real, current and open to the people you
              serve: we review them before anyone sees them. Nothing is sent back to you, and nobody is asked whether they went.
            </p>
            {referrals.map((row, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`${id}-r${index}-name`}>Place {index + 1}: its name</Label>
                  <Input id={`${id}-r${index}-name`} value={row.name} onChange={(e) => setReferrals((rs) => rs.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)))} maxLength={L.labelMax + 20} placeholder="District de-addiction centre" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`${id}-r${index}-place`}>Where it is</Label>
                  <Input id={`${id}-r${index}-place`} value={row.place} onChange={(e) => setReferrals((rs) => rs.map((r, i) => (i === index ? { ...r, place: e.target.value } : r)))} maxLength={L.placeMax + 20} placeholder="Civil Lines, Pune" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-r${index}-phone`}>Phone</Label>
                  <Input id={`${id}-r${index}-phone`} type="tel" value={row.phone} onChange={(e) => setReferrals((rs) => rs.map((r, i) => (i === index ? { ...r, phone: e.target.value } : r)))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-r${index}-url`}>Web page (https)</Label>
                  <Input id={`${id}-r${index}-url`} type="url" value={row.url} onChange={(e) => setReferrals((rs) => rs.map((r, i) => (i === index ? { ...r, url: e.target.value } : r)))} placeholder="https://" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`${id}-r${index}-hours`}>Hours</Label>
                  <Input id={`${id}-r${index}-hours`} value={row.hours} onChange={(e) => setReferrals((rs) => rs.map((r, i) => (i === index ? { ...r, hours: e.target.value } : r)))} maxLength={L.hoursMax + 20} />
                </div>
              </div>
            ))}
            {referrals.length < L.referralsMax && (
              <Button type="button" variant="outline" size="sm" onClick={() => setReferrals((rs) => [...rs, emptyReferral()])}>
                Add another place
              </Button>
            )}
          </div>
        </details>
      )}

      <details className="rounded-xl border border-border p-3">
        <summary className={SUMMARY}>Ready-made plans for your people (optional, a clinic&rsquo;s aftercare for example)</summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Up to {L.plansMax} &ldquo;when this happens, I will do that&rdquo; plans. A person can copy them into their own plans, on their own device. Nothing is sent back to you, and you are not told whether they did.
          </p>
          {plans.map((row, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`${id}-p${index}-when`}>Plan {index + 1}: when</Label>
                <Input id={`${id}-p${index}-when`} value={row.when} onChange={(e) => setPlans((p) => p.map((r, i) => (i === index ? { ...r, when: e.target.value } : r)))} maxLength={L.planTextMax + 20} placeholder="I feel the urge to drink after work" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${id}-p${index}-then`}>Then I will</Label>
                <Input id={`${id}-p${index}-then`} value={row.then} onChange={(e) => setPlans((p) => p.map((r, i) => (i === index ? { ...r, then: e.target.value } : r)))} maxLength={L.planTextMax + 20} placeholder="Call my supporter and go for a walk" />
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className="rounded-xl border border-border p-3">
        <summary className={SUMMARY}>Check-in questions for the team workspace (optional)</summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Up to {L.questionsMax} short questions. Answers stay on the person&rsquo;s device and are shared only inside the encrypted summary, if they choose to write one. Used by the team workspace.</p>
          {questions.map((question, index) => (
            <div key={index} className="space-y-1">
              <Label htmlFor={`${id}-q${index}`}>Question {index + 1}</Label>
              <Input id={`${id}-q${index}`} value={question} onChange={(e) => setQuestions((q) => q.map((v, i) => (i === index ? e.target.value : v)))} maxLength={L.questionMax + 20} />
            </div>
          ))}
        </div>
      </details>

      <details className="rounded-xl border border-border p-3">
        <summary className={SUMMARY}>The language a first-time visitor sees (optional)</summary>
        <div className="mt-3 space-y-1">
          <Label htmlFor={`${id}-locale`}>Language</Label>
          <select id={`${id}-locale`} value={locale} onChange={(e) => setLocale(e.target.value)} className={SELECT_CLASS}>
            <option value="">Their own choice</option>
            {LOCALES.map((code) => (
              <option key={code} value={code}>
                {LOCALE_ENGLISH_NAMES[code]}
              </option>
            ))}
          </select>
        </div>
      </details>

      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
          <p className="font-medium">Please fix this first:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">We read every programme before it goes live, to make sure the numbers shown to people really are yours. Until then people see the last approved version, or nothing.</p>
    </form>
  );
}
