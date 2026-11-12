"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Copies `text` to the clipboard and says so. If the browser refuses, it says that too. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-1.5">
      {state === "copied" ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {state === "copied" ? "Copied" : state === "failed" ? "Could not copy: select the text instead" : label}
      <span className="sr-only" role="status">
        {state === "copied" ? "Copied to the clipboard" : ""}
      </span>
    </Button>
  );
}
