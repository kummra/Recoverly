"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dayKey, shouldShowReminder } from "@/lib/analytics";
import { getNotificationSupport, scheduleDailyReminder } from "@/lib/notifications";

const STORAGE_KEY = "recoverly:reminderDismissedOn";

/**
 * Gentle daily check-in nudge, shown once per day after the user's chosen
 * reminder time — encouraging, never a nag, and it never implies failure.
 *
 * Limitation: this is an IN-APP nudge only; it appears while the app is open.
 * True scheduled/background notifications require a PWA service worker or a
 * native app.
 */
export function DailyNudge({ reminderTime }: { reminderTime?: string }) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!reminderTime) {
      setVisible(false);
      return;
    }
    // localStorage is only available in the browser; guard for SSR.
    let dismissedOn: string | null = null;
    try {
      dismissedOn = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      dismissedOn = null;
    }
    setVisible(shouldShowReminder({ reminderTime, lastDismissedDayKey: dismissedOn }));

    // If they've allowed notifications, also queue the OS-level one so the
    // reminder reaches them when the app isn't open.
    if (getNotificationSupport() === "granted") {
      void scheduleDailyReminder(reminderTime);
    }
  }, [reminderTime]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, dayKey());
    } catch {
      /* ignore — dismissal just won't persist */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Card className="border-sky-500/30 bg-sky-50 dark:bg-sky-950/10">
      <CardContent className="flex items-start gap-3 pt-6">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-sky-800 dark:text-sky-200">{t("nudge.title")}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("nudge.body")}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={dismiss}
          aria-label={t("nudge.dismiss")}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
