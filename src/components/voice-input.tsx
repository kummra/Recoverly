"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/types";

/**
 * Speech-to-text for the AI coach.
 *
 * Typing Devanagari, Tamil or Malayalam on a phone keyboard is slow enough that
 * it puts the coach out of reach for many of the people we translated the app
 * for. Speaking is the difference between using it and not.
 *
 * Privacy: the Web Speech API is implemented by the browser, and most desktop
 * browsers stream the audio to their vendor rather than transcribing locally.
 * For an app about someone's drinking that is a real disclosure, not a footnote
 * — so the caller shows a notice, and this stays strictly opt-in per use. We
 * never record, store or transmit audio ourselves; only the finished text ever
 * reaches our code, and only when the user chooses to speak.
 */

/** Regional speech tags. India variants match how these languages are spoken. */
const SPEECH_LOCALES: Record<Locale, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  pa: "pa-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  gu: "gu-IN"
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { locale, t } = useI18n();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Feature-detect after mount: checking during render would differ between
  // server and client and desync hydration. A browser without support simply
  // never sees the button, rather than getting one that does nothing.
  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  // Never leave the microphone open if the user navigates away mid-sentence.
  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const stop = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const start = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = SPEECH_LOCALES[locale] ?? "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, i) => event.results[i]?.[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) onTranscript(transcript);
    };
    // Permission denied, no speech, offline — all end the same way for the
    // user: the button stops pulsing and they can type instead.
    recognition.onerror = () => stop();
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={listening ? "default" : "outline"}
      size="icon"
      className="h-10 w-10 shrink-0"
      aria-pressed={listening}
      onClick={listening ? stop : start}
    >
      {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      <span className="sr-only">{t(listening ? "voice.stop" : "voice.start")}</span>
    </Button>
  );
}
