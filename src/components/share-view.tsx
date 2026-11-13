"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AlertCircle, Printer, ShieldCheck } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { SnapshotArticle } from "@/components/snapshot-article";
import { Button } from "@/components/ui/button";
import { type ShareSnapshot, parseShareId, parseShareKey } from "@/lib/share";
import { fetchSharedCopy } from "@/lib/share-client";
import { cryptoAvailable, openSnapshot } from "@/lib/share-crypto";

type State =
  | { status: "loading" }
  /** incomplete: no usable key or address. gone: stopped, ended or never there. cannot: would not unscramble.
   *  failed: the server could not be reached (worth trying again). */
  | { status: "error"; kind: "incomplete" | "gone" | "cannot" | "failed" }
  | { status: "ready"; snapshot: ShareSnapshot; createdAt: number; expiresAt: number };

const ERROR_KEYS = {
  incomplete: "shareView.incomplete",
  gone: "shareView.gone",
  cannot: "shareView.cannot",
  failed: "share.failed"
} as const;

/**
 * The page a summary link opens, `/share/{id}#{key}`, for someone with no account
 * (a doctor, a counsellor, a family member).
 *
 * The browser fetches the scrambled copy using only the address, then unscrambles
 * it here with the key from after the `#`, which never leaves this page: it is not
 * sent to the server and not in any request. Everything shown has been through
 * `sanitiseSnapshot`, and is rendered as plain text, so a link made by someone
 * else cannot add anything to the page. The headings and wording are the report's
 * own, in the reader's language.
 */
export function ShareView({ rawId }: { rawId: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  // Pasting a link that differs only after the # (a new key for the same address) is a hash change, not
  // a page load: open it again instead of showing what was there before.
  useEffect(() => {
    const again = () => setAttempt((n) => n + 1);
    window.addEventListener("hashchange", again);
    return () => window.removeEventListener("hashchange", again);
  }, []);

  useEffect(() => {
    const id = parseShareId(rawId);
    const key = parseShareKey(window.location.hash);
    if (!id || !key) {
      setState({ status: "error", kind: "incomplete" });
      return;
    }
    if (!cryptoAvailable()) {
      setState({ status: "error", kind: "cannot" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });
    void (async () => {
      const copy = await fetchSharedCopy(id, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!copy.ok) {
        setState({ status: "error", kind: copy.reason === "gone" ? "gone" : "failed" });
        return;
      }
      const snapshot = await openSnapshot({ key, iv: copy.iv, ct: copy.ct });
      if (controller.signal.aborted) return;
      setState(snapshot ? { status: "ready", snapshot, createdAt: copy.createdAt, expiresAt: copy.expiresAt } : { status: "error", kind: "cannot" });
    })();
    return () => controller.abort();
  }, [rawId, attempt]);

  if (state.status === "loading") {
    return (
      <p role="status" className="mx-auto max-w-3xl text-sm text-muted-foreground">
        {t("shareView.loading")}
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p role="alert" className="flex items-start gap-2 text-sm leading-relaxed text-body">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          {t(ERROR_KEYS[state.kind])}
        </p>
        <div className="flex flex-wrap gap-2">
          {state.kind === "failed" && (
            <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
              {t("error.retry")}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/">{t("nav.home")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { snapshot, createdAt, expiresAt } = state;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <p className="flex max-w-xl items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          {t("shareView.explain")}
        </p>
        <Button type="button" onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-4 w-4" aria-hidden /> {t("report.print")}
        </Button>
      </div>

      <SnapshotArticle
        snapshot={snapshot}
        meta={t("share.activeLine", { created: format(new Date(createdAt), "d MMM yyyy"), expires: format(new Date(expiresAt), "d MMM yyyy, h:mm a") })}
      />
    </div>
  );
}
