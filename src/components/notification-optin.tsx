"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  type NotificationSupport,
  getNotificationSupport,
  requestNotificationPermission,
  scheduleDailyReminder
} from "@/lib/notifications";

/**
 * Opt-in for OS-level check-in reminders. Shown next to the reminder time so
 * the two settings read as one idea.
 */
export function NotificationOptIn({ reminderTime }: { reminderTime?: string }) {
  const t = useT();
  const [state, setState] = useState<NotificationSupport>("unsupported");

  useEffect(() => setState(getNotificationSupport()), []);

  const enable = async () => {
    const next = await requestNotificationPermission();
    setState(next);
    if (next === "granted" && reminderTime) await scheduleDailyReminder(reminderTime);
  };

  if (state === "unsupported") return null;

  if (state === "granted") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
        <Check className="h-3.5 w-3.5" />
        {t("notify.on")}{" "}
        {reminderTime ? t("notify.onWithTime") : t("notify.onNoTime")}
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="flex items-start gap-1.5 text-xs text-subtle">
        <BellOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t("notify.blocked")}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={enable}>
        <Bell className="h-3.5 w-3.5" />
        {t("notify.enable")}
      </Button>
      <p className="text-xs text-subtle">
        {t("notify.enableHint")}
      </p>
    </div>
  );
}
