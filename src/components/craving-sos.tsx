"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Heart, LifeBuoy, LifeBuoy as Ring, Waves, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { breathPhaseAt } from "@/lib/analytics";
import { addCravingEvent } from "@/lib/firestore";
import { HELPLINES } from "@/lib/safety";
import { CRAVING_OUTCOMES } from "@/lib/schemas";

/**
 * Craving SOS — an urge-surfing companion for the hardest moment.
 *
 * The premise (standard in relapse-prevention work): a craving is a wave. It
 * rises, peaks and passes, usually within a few minutes, whether or not you act
 * on it. Riding it out once makes the next one easier.
 *
 * Design rules that matter more than the UI here:
 *  - Opening this is itself a win. We log the event regardless of outcome and
 *    never imply failure if they drank.
 *  - Real help is always one tap away — the AI coach and live helplines are on
 *    screen the whole time, not buried behind the timer.
 *  - It can be closed instantly. Trapping someone mid-craving would be cruel.
 */

/** Cravings typically crest and fall within a few minutes. */
const SUGGESTED_SECONDS = 300;

type Phase = "intro" | "surfing" | "outcome" | "done";

export function CravingSos({ userId, motivation }: { userId: string; motivation?: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [intensity, setIntensity] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(false);

  const reset = useCallback(() => {
    setPhase("intro");
    setIntensity(3);
    setElapsed(0);
    setSaving(false);
    savedRef.current = false;
  }, []);

  // One timer, one piece of state: the breath step is derived from elapsed.
  useEffect(() => {
    if (phase !== "surfing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const record = async (outcome: (typeof CRAVING_OUTCOMES)[number]) => {
    if (savedRef.current) return;
    savedRef.current = true;
    setSaving(true);
    try {
      await addCravingEvent(userId, { intensity, outcome, secondsElapsed: elapsed });
    } catch {
      // Never block the user on a logging failure in this moment.
    } finally {
      setSaving(false);
      setPhase("done");
    }
  };

  const close = () => {
    setOpen(false);
    // Let the dialog animate out before resetting.
    setTimeout(reset, 200);
  };

  const step = breathPhaseAt(elapsed);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const progress = Math.min(elapsed / SUGGESTED_SECONDS, 1);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-center gap-2 border-sky-500/40 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300 sm:w-auto"
      >
        <Waves className="h-4 w-4" />
        I&apos;m struggling right now
      </Button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-md">
          {phase === "intro" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Waves className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  Let&apos;s ride this out together
                </DialogTitle>
                <DialogDescription>
                  Cravings rise, peak and pass — usually within a few minutes. You don&apos;t have to
                  fight it, just outlast it.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">How strong is it right now?</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setIntensity(n)}
                        aria-label={`Intensity ${n} of 5`}
                        aria-pressed={intensity === n}
                        className={`h-11 flex-1 rounded-xl border text-sm font-medium transition-colors ${
                          intensity === n
                            ? "border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-200"
                            : "border-border text-muted-foreground hover:bg-surface"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-subtle">1 = mild · 5 = overwhelming</p>
                </div>

                <Button type="button" className="w-full" onClick={() => setPhase("surfing")}>
                  Start
                </Button>
              </div>
            </>
          )}

          {phase === "surfing" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Waves className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  Riding the wave
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-2 text-center">
                {/* Breathing pacer — the circle expands on the in-breath. */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="flex h-32 w-32 items-center justify-center rounded-full bg-sky-500/10 transition-transform duration-1000 ease-in-out"
                    style={{ transform: `scale(${step.scale})` }}
                  >
                    <div className="text-center">
                      <p className="text-base font-semibold text-sky-700 dark:text-sky-200">{step.label}</p>
                      <p className="text-2xl font-bold tabular-nums">{step.remaining}</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-subtle tabular-nums">
                    {mins}:{secs.toString().padStart(2, "0")} — most cravings ease within about five minutes
                  </p>
                </div>

                {motivation && (
                  <p className="flex items-start gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-left text-sm italic text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200/80">
                    <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {motivation}
                  </p>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild variant="outline" className="gap-1.5">
                    <Link href="/ai">
                      <Bot className="h-4 w-4" /> Talk it through
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="gap-1.5">
                    <Link href="/support">
                      <LifeBuoy className="h-4 w-4" /> Get help now
                    </Link>
                  </Button>
                </div>

                <p className="text-xs text-subtle">
                  In crisis? Tele-MANAS{" "}
                  <a href={`tel:${HELPLINES.india.teleManas}`} className="font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300">
                    {HELPLINES.india.teleManas}
                  </a>{" "}
                  · Emergency{" "}
                  <a href={`tel:${HELPLINES.india.emergency}`} className="font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300">
                    {HELPLINES.india.emergency}
                  </a>
                </p>

                <Button type="button" className="w-full" onClick={() => setPhase("outcome")}>
                  I&apos;m done
                </Button>
              </div>
            </>
          )}

          {phase === "outcome" && (
            <>
              <DialogHeader>
                <DialogTitle>How did it go?</DialogTitle>
                <DialogDescription>
                  There&apos;s no wrong answer here. Reaching for support is the part that counts.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Button type="button" variant="outline" className="w-full justify-start" disabled={saving} onClick={() => record("passed")}>
                  It passed — I didn&apos;t drink
                </Button>
                <Button type="button" variant="outline" className="w-full justify-start" disabled={saving} onClick={() => record("drank")}>
                  I drank
                </Button>
                <Button type="button" variant="outline" className="w-full justify-start" disabled={saving} onClick={() => record("unresolved")}>
                  Still with me
                </Button>
              </div>
            </>
          )}

          {phase === "done" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Ring className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  That took strength
                </DialogTitle>
                <DialogDescription>
                  You reached for support instead of doing this alone — that&apos;s the skill that
                  carries forward. Every time you ride one out, the next is a little easier.
                </DialogDescription>
              </DialogHeader>
              <Button type="button" className="mt-2 w-full" onClick={close}>
                Close
              </Button>
            </>
          )}

          {phase !== "done" && (
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-surface"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
