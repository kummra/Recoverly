"use client";

import { Fragment, useId } from "react";
import Link from "next/link";
import { BookOpen, Heart, ShieldAlert } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { WithdrawalWarning } from "@/components/safety-notice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SlipMoment } from "@/lib/analytics";
import { HELPLINES } from "@/lib/safety";
import { learnPath } from "@/lib/seo/alternates";

/** The id of the check-in button, so focus can go back to where the person was. */
export const LOG_DRINK_BUTTON_ID = "log-drink-button";

/**
 * Makes the two helpline numbers in a translated sentence tappable. The
 * sentences are the reviewed ones from the guide, so rather than rewrite them
 * around a link, the numbers are found in the text (they are Latin digits in
 * every language, which a test enforces) and wrapped. In a crisis, tapping
 * beats copying a number into a dialler.
 */
function withCallLinks(text: string) {
  return text.split(/(\b14416\b|\b112\b)/).map((part, i) => {
    const isHelpline = part === HELPLINES.india.teleManas || part === HELPLINES.india.emergency;
    return isHelpline ? (
      <a
        key={i}
        href={`tel:${part}`}
        className="-mx-1 rounded px-1 py-2 font-semibold text-sky-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-sky-300"
      >
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    );
  });
}

/**
 * What a person sees right after logging a drink when they had been trying to
 * stop. Most apps meet this moment by resetting a counter to zero. That is
 * both untrue (the days still happened) and the thing most likely to turn one
 * drink into a lost week: the "what-the-hell" reaction to a broken streak.
 *
 * So it leads with what survives, then says the two things that are actually
 * dangerous to leave unsaid at this exact moment (a body that has been
 * drinking less reacts more strongly, and a heavy daily drinker should not
 * stop abruptly), then points at a person and at the guide.
 *
 * The sentences about safety are the ones from the "after a drinking slip"
 * guide and the app's standing withdrawal warning, in each language, so they
 * carry wording that was fact-checked and independently reviewed rather than a
 * second, unreviewed version. The warning that stopping suddenly can be
 * dangerous is the same size and weight as the one about tolerance: for
 * someone who drinks heavily every day it is the more serious of the two.
 *
 * It is read out when it opens (all of the safety text is in its description,
 * and focus starts at the top rather than on the button at the bottom), closes
 * with one tap, and is never shown twice for the same drink.
 */
export function SlipMomentDialog({ moment, onClose }: { moment: SlipMoment | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const bodyId = useId();
  const safetyId = useId();

  return (
    <Dialog open={moment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="outline-none sm:max-w-md"
        aria-describedby={`${bodyId} ${safetyId}`}
        onOpenAutoFocus={(event) => {
          // Start at the top so a screen reader reads the title and the safety
          // text in order, instead of landing on the Close button at the bottom.
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
        onCloseAutoFocus={(event) => {
          // Back to the check-in button. The dialog was opened by code, not by a
          // trigger, so there is nothing for it to return to on its own.
          event.preventDefault();
          document.getElementById(LOG_DRINK_BUTTON_ID)?.focus();
        }}
      >
        {moment && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {t("slip.title")}
              </DialogTitle>
              <DialogDescription id={bodyId}>{t("slip.body")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 p-3 dark:bg-emerald-950/10">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{moment.runDays}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t(moment.runDays === 1 ? "dashboard.dayAlcoholFree" : "dashboard.daysAlcoholFree")}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted p-3">
                  <p className="text-2xl font-bold">{moment.longestDays}</p>
                  <p className="text-[11px] text-muted-foreground">{t("dashboard.longestStreak")}</p>
                </div>
              </div>

              <div id={safetyId} className="space-y-4">
                {moment.showTolerance && (
                  <div
                    role="note"
                    className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm leading-relaxed text-body"
                  >
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
                    <p>{t("slip.tolerance")}</p>
                  </div>
                )}

                {/* The standing warning, with its reason: why stopping suddenly
                    can be dangerous, not just that it is. */}
                <WithdrawalWarning />

                <p className="text-sm leading-relaxed text-body">{t("slip.next")}</p>
                <p className="text-sm leading-relaxed text-body">{withCallLinks(t("slip.help"))}</p>
              </div>

              <Link
                href={learnPath(locale, "after-a-drinking-slip")}
                className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm font-medium text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                {t("slip.guideTitle")}
              </Link>

              <Button type="button" className="w-full" onClick={onClose}>
                {t("common.close")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
