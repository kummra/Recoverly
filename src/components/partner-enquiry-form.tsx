"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MESSAGE_LENGTH, ORG_TYPES, ORG_TYPE_LABELS, parseEnquiry } from "@/lib/partners";

/**
 * The enquiry form on /partners. The page is English only (its readers run
 * organisations and read English at work), so its words live here and not in
 * the nine-language dictionaries that ship to every visitor.
 */

type Status = "idle" | "sending" | "sent" | "failed" | "limited";

const FIELD_MESSAGES: Record<string, string> = {
  name: "Please enter your name.",
  email: "Please enter an email address we can reply to.",
  organisation: "Please enter the name of your organisation.",
  orgType: "Please choose the kind of organisation.",
  role: "That is too long. Please shorten it.",
  message: `That is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
  consent: "Please tick the box so we know you are happy for us to reply."
};

/** In the order they appear, so focus goes to the first one that is wrong. */
const FIELD_ORDER = ["name", "email", "organisation", "orgType", "role", "message", "consent"] as const;

const SELECT_CLASS =
  "flex h-11 w-full rounded-2xl border border-input bg-surface-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PartnerEnquiryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<string[]>([]);

  const show = (fields: string[]) => {
    setErrors(fields);
    const first = FIELD_ORDER.find((f) => fields.includes(f));
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      organisation: String(form.get("organisation") ?? ""),
      orgType: String(form.get("orgType") ?? ""),
      role: String(form.get("role") ?? ""),
      message: String(form.get("message") ?? ""),
      consent: form.get("consent") === "on",
      // The hidden field. People never fill it in; some bots do.
      website: String(form.get("website") ?? "")
    };

    const checked = parseEnquiry(payload);
    if (!checked.ok) {
      setStatus("idle");
      show(checked.fields);
      return;
    }

    setErrors([]);
    setStatus("sending");
    try {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setStatus("sent");
        return;
      }
      if (response.status === 429) {
        setStatus("limited");
        return;
      }
      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as { fields?: string[] } | null;
        setStatus("idle");
        show(body?.fields ?? []);
        return;
      }
      setStatus("failed");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "sent") {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex items-start gap-3 py-6">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <div role="status">
            <p className="font-semibold">Thank you. We have your enquiry.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We will reply to the email address you gave. Nothing else is done with your details.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const invalid = (field: string) => errors.includes(field);
  const describedBy = (field: string) => (invalid(field) ? `error-${field}` : undefined);
  const fieldError = (field: string) =>
    invalid(field) ? (
      <p id={`error-${field}`} className="text-xs text-red-700 dark:text-red-300">
        {FIELD_MESSAGES[field]}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-4" aria-label="Enquiry form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pe-name">Your name</Label>
          <Input id="pe-name" name="name" autoComplete="name" maxLength={80} required aria-invalid={invalid("name")} aria-describedby={describedBy("name")} />
          {fieldError("name")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pe-email">Work email</Label>
          <Input id="pe-email" name="email" type="email" autoComplete="email" maxLength={120} required aria-invalid={invalid("email")} aria-describedby={describedBy("email")} />
          {fieldError("email")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pe-organisation">Organisation</Label>
          <Input id="pe-organisation" name="organisation" autoComplete="organization" maxLength={120} required aria-invalid={invalid("organisation")} aria-describedby={describedBy("organisation")} />
          {fieldError("organisation")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pe-orgType">Type of organisation</Label>
          <select id="pe-orgType" name="orgType" defaultValue="" required className={SELECT_CLASS} aria-invalid={invalid("orgType")} aria-describedby={describedBy("orgType")}>
            <option value="" disabled>
              Choose one
            </option>
            {ORG_TYPES.map((type) => (
              <option key={type} value={type}>
                {ORG_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          {fieldError("orgType")}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pe-role">Your role (optional)</Label>
        <Input id="pe-role" name="role" autoComplete="organization-title" maxLength={80} aria-invalid={invalid("role")} aria-describedby={describedBy("role")} />
        {fieldError("role")}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pe-message">What would you like to explore? (optional)</Label>
        <Textarea id="pe-message" name="message" maxLength={MAX_MESSAGE_LENGTH} rows={4} aria-invalid={invalid("message")} aria-describedby={describedBy("message")} />
        <p className="text-xs text-subtle">Please do not include personal or medical details about any individual.</p>
        {fieldError("message")}
      </div>

      {/* Honeypot: off screen and out of the tab order. Real visitors never see it. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Leave this empty
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input
            id="pe-consent"
            name="consent"
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-emerald-600"
            aria-invalid={invalid("consent")}
            aria-describedby={describedBy("consent")}
          />
          <Label htmlFor="pe-consent" className="text-sm font-normal leading-relaxed text-body">
            I agree that Recoverly may use these details to reply to my enquiry and to keep a record of our conversation. They are never sold or
            used for advertising, and I can ask for them to be deleted at any time. See the{" "}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
              privacy policy
            </Link>
            .
          </Label>
        </div>
        {fieldError("consent")}
      </div>

      {status === "failed" && (
        <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          We could not send your enquiry just now. Nothing has been lost from the form, so please try again in a little while.
        </p>
      )}
      {status === "limited" && (
        <p role="alert" className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          Several enquiries have been sent from this connection in a short time. Please try again in an hour.
        </p>
      )}
      {errors.length > 0 && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          Please check the fields marked above.
        </p>
      )}

      <Button type="submit" disabled={status === "sending"} className="gap-2">
        {status === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {status === "sending" ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
  );
}
