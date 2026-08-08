"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="animate-fade-in-up mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">{t("error.title")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("error.body")}</p>
      <Button className="mt-4 gap-2" variant="secondary" onClick={reset}>
        <RotateCcw className="h-4 w-4" />
        {t("error.retry")}
      </Button>
    </div>
  );
}
