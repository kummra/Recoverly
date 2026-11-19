"use client";

import { useEffect, useState } from "react";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getNotificationSupport, scheduleDailyReminder } from "@/lib/notifications";
import { cleanQuietHours, readQuietHours, writeQuietHours } from "@/lib/quiet-hours";

/**
 * Quiet hours for the reminder, for sleep and night shifts. Saved as soon as both times are chosen, on this device
 * only (`lib/quiet-hours.ts`): it is not part of the account and is never sent anywhere. If notifications are on,
 * the reminder is scheduled again so it respects the new window.
 */
export function QuietHoursEditor({ reminderTime }: { reminderTime?: string }) {
  const t = useT();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    const saved = readQuietHours();
    if (saved) {
      setStart(saved.start);
      setEnd(saved.end);
    }
  }, []);

  const change = (nextStart: string, nextEnd: string) => {
    setStart(nextStart);
    setEnd(nextEnd);
    const window = cleanQuietHours({ start: nextStart, end: nextEnd });
    // Two good, different times: keep them. Nothing chosen, or the same time twice: no quiet hours. Only one chosen so far: wait for the other.
    if (window) writeQuietHours(window);
    else if ((!nextStart && !nextEnd) || (nextStart && nextStart === nextEnd)) writeQuietHours(null);
    else return;
    if (reminderTime && getNotificationSupport() === "granted") void scheduleDailyReminder(reminderTime);
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("settings.quietHours")}</legend>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="quiet-start" className="text-xs font-normal text-subtle">
            {t("settings.quietFrom")}
          </Label>
          <Input id="quiet-start" type="time" value={start} onChange={(e) => change(e.target.value, end)} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quiet-end" className="text-xs font-normal text-subtle">
            {t("settings.quietTo")}
          </Label>
          <Input id="quiet-end" type="time" value={end} onChange={(e) => change(start, e.target.value)} className="w-36" />
        </div>
        {(start || end) && (
          <Button type="button" variant="ghost" size="sm" onClick={() => change("", "")}>
            {t("settings.quietClear")}
          </Button>
        )}
      </div>
      <p className="text-xs text-subtle">{t("settings.quietHoursHint")}</p>
    </fieldset>
  );
}
