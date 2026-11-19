"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { LanguageSettings } from "@/components/language-settings";
import { ListenButton } from "@/components/listen-button";
import { WithdrawalWarning } from "@/components/safety-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { clearAppStorage } from "@/lib/field-mode";
import { createTranslator } from "@/lib/i18n/dictionaries";
import { HELPLINES } from "@/lib/safety";

type Step = "idle" | "confirm" | "working" | "failed";

const LINK = "rounded underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * A page for the person who helps several people on one phone. It does four things: clears the phone between people
 * (signs out and removes what the app saved here, never anyone's account), lets the helper pick the next person's language,
 * reads the safety message aloud in that language, and reminds the helper of the few rules that keep a shared phone safe.
 * English, like the pages for organisations; the message that is read aloud is in the person's language.
 */
export function FieldContent() {
  const { user, signOutUser } = useAuth();
  const { locale } = useI18n();
  const t = createTranslator(locale);
  const [step, setStep] = useState<Step>("idle");
  const [cleared, setCleared] = useState(false);

  // The page reloads itself after clearing, so nothing in memory carries on from the last person.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cleared") === "1") {
      setCleared(true);
      window.history.replaceState(null, "", "/field");
    }
  }, []);

  const clear = async () => {
    setStep("working");
    try {
      if (user) await signOutUser();
      clearAppStorage(window.localStorage);
      try {
        clearAppStorage(window.sessionStorage);
      } catch {
        /* session storage may be unavailable; local storage is the one that matters */
      }
      window.location.assign("/field?cleared=1");
    } catch {
      setStep("failed");
    }
  };

  return (
    <div className="space-y-8">
      {cleared && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          This phone is clear and ready for the next person.
        </p>
      )}

      <section aria-labelledby="between" className="space-y-3">
        <h2 id="between" className="text-xl font-semibold">
          1. Between people
        </h2>
        <p className="text-sm leading-relaxed text-body">Press this when a person has finished, every time. It signs out of Recoverly and removes everything the app saved on this phone.</p>
        {step === "idle" || step === "failed" ? (
          <Button type="button" size="lg" className="gap-2" onClick={() => setStep("confirm")}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Next person: clear this phone
          </Button>
        ) : (
          <Card>
            <CardContent className="space-y-3 py-5">
              <p className="text-sm leading-relaxed">
                This signs out and removes what Recoverly saved on this phone: the language, a programme joined here, plans, the person to call, reminder settings and the privacy lock. It does <strong>not</strong> delete anyone&rsquo;s account or
                records: those stay in the person&rsquo;s own account, and they can sign in again on their own phone.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="lg" onClick={() => void clear()} disabled={step === "working"}>
                  {step === "working" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                  Yes, clear it
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={() => setStep("idle")} disabled={step === "working"}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === "failed" && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm">
            Something stopped it. Sign out from the menu, then try again.
          </p>
        )}
      </section>

      <section aria-labelledby="language" className="space-y-3">
        <h2 id="language" className="text-xl font-semibold">
          2. The person&rsquo;s language
        </h2>
        <p className="text-sm leading-relaxed text-body">Choose it here. The app, and the message below, then use it.</p>
        <LanguageSettings />
      </section>

      <section aria-labelledby="aloud" className="space-y-3">
        <h2 id="aloud" className="text-xl font-semibold">
          3. Read this to them before they cut down or stop
        </h2>
        <div id="field-script" lang={locale} className="space-y-3">
          <WithdrawalWarning locale={locale} />
          <div className="space-y-1 text-sm leading-relaxed">
            <p className="font-medium">{t("support.crisisHeading")}</p>
            <p>
              {t("support.teleManasName")}: {HELPLINES.india.teleManas}. {t("support.teleManasDetail")}.
            </p>
            <p>
              {t("support.emergencyName")}: {HELPLINES.india.emergency}. {t("support.emergencyDetail")}.
            </p>
          </div>
        </div>
        <ListenButton targetId="field-script" locale={locale} />
        <p className="text-xs leading-relaxed text-muted-foreground">If there is no Read aloud button, this phone has no voice for that language: read the message to them from the screen.</p>
      </section>

      <section aria-labelledby="links" className="space-y-3">
        <h2 id="links" className="text-xl font-semibold">
          4. Where to go next
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button asChild size="lg" variant="outline">
            <Link href="/support">Support &amp; helplines</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/learn">Guides</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/assessment">Self-check</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="rules" className="space-y-3">
        <h2 id="rules" className="text-xl font-semibold">
          Rules for a shared phone
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-body">
          <li>Never type, save or remember someone&rsquo;s password for them. If they want an account, they make it themselves, ideally on their own phone, or sign in and out here with you beside them, not looking.</li>
          <li>Clear the phone after every person, even if they did not sign in.</li>
          <li>Do not write down, photograph or pass on what someone tells you or logs. What a person tells you is theirs.</li>
          <li>Tell anyone who drinks heavily or every day to talk to a doctor before they cut down or stop: stopping suddenly can be dangerous.</li>
          <li>
            If someone talks about harming themselves, or is in danger now, do not wait: call 112, or Tele-MANAS on 14416. See{" "}
            <Link href="/partners/toolkit/disclosure-protocol" className={LINK}>
              what to do if someone tells you they are struggling
            </Link>
            .
          </li>
          <li>
            Recoverly gives support and information, not medical advice. You do not need to be an expert:{" "}
            <Link href="/partners/toolkit/help-a-friend" className={LINK}>
              how to help
            </Link>
            .
          </li>
        </ul>
      </section>
    </div>
  );
}
