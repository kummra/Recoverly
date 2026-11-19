"use client";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";

/**
 * A private link, shown once. Its secret is not kept anywhere we can read it back (only a hash is), so this is the
 * one moment it can be saved. The notice stays until the person says they have saved it.
 */
export function SecretNotice({ title, link, note, onDone }: { title: string; link: string; note: string; onDone: () => void }) {
  return (
    <div role="alert" className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="break-all rounded-lg bg-background/60 p-2 font-mono text-xs">{link}</p>
      <p className="text-xs leading-relaxed text-body">{note}</p>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={link} label="Copy the link" />
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          I have saved it
        </Button>
      </div>
    </div>
  );
}
