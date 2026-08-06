"use client";

/**
 * Browser notification support for the daily check-in.
 *
 * Scope, stated honestly: this schedules a one-shot notification through the
 * service worker while the browser is alive. It is a real OS notification
 * (unlike the in-app banner) but it is not server push — a fully backgrounded
 * or force-closed browser may not fire it. True guaranteed delivery needs Web
 * Push with a server, which is a bigger change; the UI copy promises only what
 * this actually does.
 */

export type NotificationSupport = "unsupported" | "default" | "granted" | "denied";

export function getNotificationSupport(): NotificationSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission as NotificationSupport;
}

/** Must be called from a user gesture — browsers reject unprompted requests. */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (getNotificationSupport() === "unsupported") return "unsupported";
  try {
    return (await Notification.requestPermission()) as NotificationSupport;
  } catch {
    return "denied";
  }
}

/** Milliseconds until the next occurrence of HH:MM, local time. */
export function msUntilNext(timeHHMM: string, now: Date = new Date()): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeHHMM);
  if (!m) return null;
  const target = new Date(now);
  target.setHours(Number(m[1]), Number(m[2]), 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

export async function scheduleDailyReminder(timeHHMM: string): Promise<boolean> {
  if (getNotificationSupport() !== "granted") return false;
  const delayMs = msUntilNext(timeHHMM);
  if (delayMs == null) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "SCHEDULE_REMINDER", delayMs });
    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "CANCEL_REMINDER" });
  } catch {
    /* nothing to cancel */
  }
}
