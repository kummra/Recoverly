/**
 * The device's side of the anonymous monthly headcount: send one tick a month, if
 * and only if the person ticked "count me" for a programme that offers it.
 *
 * What is sent is the programme's code and nothing else (the request is signed in
 * only so a count cannot be faked; see `app/api/programme/count/route.ts`). The
 * device remembers the month it last sent for, so it is at most once a month however
 * often the dashboard is opened. Nothing is sent for a person who has not ticked,
 * for a programme that does not offer it, or after they untick (`setCounted`).
 */
import { monthKey } from "@/lib/programme-count";
import { loadMembership, markCountedMonth } from "@/lib/programme-membership";

type Fetch = typeof fetch;

/** `true` when the tick needs no retry this month: sent, or the programme no longer asks for ticks. */
export async function sendTick(code: string, token: string, fetchImpl: Fetch = fetch): Promise<boolean> {
  try {
    const response = await fetchImpl("/api/programme/count", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code })
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

/** off: not ticked (or not offered). not-due: already sent this month. sent. failed: try again next time. */
export type TickOutcome = "off" | "not-due" | "sent" | "failed";

export async function tickIfDue(
  userId: string,
  getToken: () => Promise<string | null>,
  options: { now?: Date; fetchImpl?: Fetch } = {}
): Promise<TickOutcome> {
  const membership = loadMembership(userId);
  if (!membership || !membership.counted || membership.programme.headcount !== true) return "off";

  const month = monthKey(options.now ?? new Date());
  if (membership.countedMonth === month) return "not-due";

  // Mark the month first, so a second tab opened at the same moment does not send a
  // second tick; put it back if this one does not get through, so it is tried again.
  const previous = membership.countedMonth;
  markCountedMonth(userId, month);
  let sent = false;
  try {
    const token = await getToken();
    sent = token ? await sendTick(membership.programme.code, token, options.fetchImpl) : false;
  } catch {
    sent = false;
  }
  if (!sent) {
    markCountedMonth(userId, previous);
    return "failed";
  }
  return "sent";
}
