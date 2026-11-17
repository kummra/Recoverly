"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Saves a CSV the page already built from its own displayed figures. Nothing is sent anywhere. */
export function ReportCsvButton({ csv, filename = "recoverly-monthly-report.csv" }: { csv: string; filename?: string }) {
  const save = () => {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={save} className="gap-1.5 print:hidden">
      <Download className="h-3.5 w-3.5" aria-hidden /> Download CSV
    </Button>
  );
}
