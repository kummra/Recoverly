"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Opens the browser's print dialog, where "Save as PDF" is also an option. Hidden on paper. */
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <Button type="button" onClick={() => window.print()} className="gap-1.5 print:hidden">
      <Printer className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}
