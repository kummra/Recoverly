"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Printer } from "lucide-react";

import { PosterSheet } from "@/components/poster-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOCALES, LOCALE_ENGLISH_NAMES, LOCALE_NAMES, type Locale, isLocale } from "@/lib/i18n/types";
import { normaliseCode } from "@/lib/programme";
import { lookupProgramme } from "@/lib/programme-membership";
import { MAX_ORG_NAME, type PosterFormat, cleanOrgName, posterHref } from "@/lib/toolkit";

type CodeStatus =
  | { state: "none" }
  | { state: "checking" }
  | { state: "found"; code: string; name: string }
  | { state: "unknown" }
  | { state: "error" };

/**
 * Builds a poster or a sheet of pocket cards for an organisation, in any of the
 * nine languages, with a QR code to the app or to its programme. English, like the
 * page around it; the poster itself is in the language chosen.
 *
 * A programme code is checked against the server before it goes on paper, and the
 * print links stay off until it is right: a QR code to a page that says "we do not
 * recognise that code" would be printed, pinned up and wrong for months.
 */
export function KitGenerator() {
  const ids = { org: useId(), code: useId(), lang: useId() };
  const [org, setOrg] = useState("");
  const [codeText, setCodeText] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [format, setFormat] = useState<PosterFormat>("poster");
  const [status, setStatus] = useState<CodeStatus>({ state: "none" });

  const typedCode = normaliseCode(codeText);
  const hasText = codeText.trim() !== "";

  useEffect(() => {
    if (!hasText) {
      setStatus({ state: "none" });
      return;
    }
    if (!typedCode) {
      setStatus({ state: "unknown" });
      return;
    }
    setStatus({ state: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(() => {
      lookupProgramme(typedCode, { signal: controller.signal }).then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok) setStatus({ state: "found", code: result.programme.code, name: result.programme.name });
        else setStatus({ state: result.reason === "not-found" || result.reason === "invalid" ? "unknown" : "error" });
      });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [hasText, typedCode]);

  const settings = {
    org: cleanOrgName(org),
    code: status.state === "found" ? status.code : null,
    locale,
    format
  };
  // Print only once what is typed is what will be printed.
  const ready = status.state === "none" || status.state === "found";
  const href = posterHref(settings);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()} noValidate>
        <div className="space-y-2">
          <Label htmlFor={ids.org}>Your organisation&rsquo;s name (optional)</Label>
          <Input id={ids.org} value={org} maxLength={MAX_ORG_NAME} autoComplete="off" onChange={(event) => setOrg(event.target.value)} />
          <p className="text-xs text-subtle">Printed as &ldquo;Shared by &hellip;&rdquo;. Use your own organisation&rsquo;s name only.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={ids.code}>Programme code (optional)</Label>
          <Input
            id={ids.code}
            value={codeText}
            maxLength={24}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="uppercase tracking-wider"
            aria-describedby={`${ids.code}-status`}
            onChange={(event) => setCodeText(event.target.value)}
          />
          <p id={`${ids.code}-status`} role="status" className="min-h-5 text-xs">
            {status.state === "none" && <span className="text-subtle">Without a code the QR code opens Recoverly&rsquo;s home page. Try the code SAMPLE.</span>}
            {status.state === "checking" && <span className="text-subtle">Checking the code&hellip;</span>}
            {status.state === "found" && (
              <span className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-300">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Found: {status.name}. The QR code opens its join page.
              </span>
            )}
            {status.state === "unknown" && (
              <span className="flex items-start gap-1.5 text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                We do not recognise that code. Fix it or clear it before printing.
              </span>
            )}
            {status.state === "error" && (
              <span className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Could not check the code just now. Please try again in a little while.
              </span>
            )}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={ids.lang}>Language of the poster</Label>
          <select
            id={ids.lang}
            value={locale}
            onChange={(event) => isLocale(event.target.value) && setLocale(event.target.value)}
            className="flex h-11 w-full rounded-2xl border border-input bg-surface-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_NAMES[l]} ({LOCALE_ENGLISH_NAMES[l]})
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What to print</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="What to print">
            {(
              [
                ["poster", "A4 poster"],
                ["cards", "Pocket cards (8 to a sheet)"]
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={format === value}
                onClick={() => setFormat(value)}
                className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  format === value ? "border-emerald-500 bg-emerald-500/10 font-medium text-foreground" : "border-border text-body hover:bg-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {ready ? (
          <Button asChild className="w-full gap-1.5">
            <Link href={href} target="_blank" rel="noopener">
              <Printer className="h-4 w-4" aria-hidden />
              Open the printable page
            </Link>
          </Button>
        ) : (
          <Button type="button" disabled className="w-full gap-1.5">
            <Printer className="h-4 w-4" aria-hidden />
            Open the printable page
          </Button>
        )}
        <p className="text-xs leading-relaxed text-subtle">
          It opens in a new tab. Use your browser&rsquo;s print command, or &ldquo;Save as PDF&rdquo;, and print at 100% scale.
        </p>
      </form>

      <div aria-label="Preview" className="min-w-0">
        <PosterSheet settings={settings} />
      </div>
    </div>
  );
}
