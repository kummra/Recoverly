"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";

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
        Reminders are on.{" "}
        {reminderTime
          ? "You'll get a notification at your chosen time."
          : "Set a time above to start getting them."}
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="flex items-start gap-1.5 text-xs text-subtle">
        <BellOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Notifications are blocked for this site. You can re-enable them in your browser&apos;s site
        settings — the in-app reminder still works either way.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={enable}>
        <Bell className="h-3.5 w-3.5" />
        Enable reminder notifications
      </Button>
      <p className="text-xs text-subtle">
        Sends one gentle notification a day at your chosen time. Works best with Recoverly installed
        to your home screen; a fully closed browser may not deliver it.
      </p>
    </div>
  );
}
