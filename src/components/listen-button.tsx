"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { pickVoice, prepareForSpeech, readableText, speechLocaleFor, splitForSpeech } from "@/lib/speech";
import { cn } from "@/lib/utils";

/**
 * Reads text aloud with the device's own voice.
 *
 * Give it either `text` (the language is worked out from the writing, because
 * the coach answers in whatever language the person used) or `targetId` plus
 * `locale` (a page whose language is known).
 *
 * It shows only if the device has a voice for that language. A button that
 * reads Tamil in an English voice would be worse than no button.
 *
 * `localOnly` skips cloud voices: some browsers send the text to a server to
 * be spoken. That is fine for a public guide and not for something the person
 * said to the coach.
 */
export function ListenButton({
  text,
  targetId,
  locale,
  localOnly = false,
  compact = false,
  className
}: {
  text?: string;
  targetId?: string;
  locale?: Locale;
  localOnly?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { t: providerT, locale: appLocale } = useI18n();
  // On a public page the URL's language decides, as with the other notices.
  const t = useMemo(() => (locale ? createTranslator(locale) : providerT), [locale, providerT]);

  const speechLocale = useMemo(() => locale ?? speechLocaleFor(text ?? "", appLocale), [locale, text, appLocale]);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);

  // Each press is a "run". Cancelling fires the old run's error handlers a
  // moment later, and they must not switch off the new run.
  const run = useRef(0);
  const speakingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    // Voices arrive after load in most browsers, so ask again when they do.
    const update = () => setVoice(pickVoice(synth.getVoices(), speechLocale, { localOnly }));
    update();
    synth.addEventListener?.("voiceschanged", update);
    return () => synth.removeEventListener?.("voiceschanged", update);
  }, [speechLocale, localOnly]);

  // Do not carry on talking after the person leaves the page.
  useEffect(() => {
    const stopIfMine = () => {
      if (speakingRef.current) window.speechSynthesis.cancel();
    };
    window.addEventListener("pagehide", stopIfMine);
    return () => {
      window.removeEventListener("pagehide", stopIfMine);
      stopIfMine();
    };
  }, []);

  if (!voice) return null;

  const finish = (mine: number) => {
    if (run.current !== mine) return;
    speakingRef.current = false;
    setSpeaking(false);
  };

  const stop = () => {
    run.current += 1;
    window.speechSynthesis.cancel();
    speakingRef.current = false;
    setSpeaking(false);
  };

  const start = () => {
    const synth = window.speechSynthesis;
    const source = text ?? (targetId ? readableText(document.getElementById(targetId) ?? document.body) : "");
    const chunks = splitForSpeech(prepareForSpeech(source));
    if (chunks.length === 0) return;

    run.current += 1;
    const mine = run.current;
    // Anything else that is speaking, here or in another button, stops first.
    synth.cancel();
    speakingRef.current = true;
    setSpeaking(true);

    // Chrome can drop the first utterance if one is spoken in the same tick as
    // a cancel, so let the cancel settle.
    window.setTimeout(() => {
      if (run.current !== mine) return;
      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 0.95;
        // Cancellation also lands here, which is what ends a stopped run.
        utterance.onerror = () => finish(mine);
        if (index === chunks.length - 1) utterance.onend = () => finish(mine);
        synth.speak(utterance);
      });
    }, 60);
  };

  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "outline"}
      size="sm"
      onClick={speaking ? stop : start}
      title={t("listen.title")}
      className={cn("gap-1.5", compact && "h-7 px-2 text-xs text-muted-foreground", className)}
    >
      {speaking ? <Square className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
      {speaking ? t("listen.stop") : t("listen.start")}
    </Button>
  );
}
