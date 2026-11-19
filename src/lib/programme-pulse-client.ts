/**
 * The device's side of the monthly question: send one answer, when the person gives it. Nothing is sent unless they press an answer;
 * "not this month" sends nothing at all. The request is signed in only so a count cannot be faked (`app/api/programme/pulse/route.ts`),
 * and carries the programme's code and the number, nothing else. `true` when the answer was taken (or the programme no longer asks).
 */
import type { PulseAnswer } from "@/lib/programme-pulse";

type Fetch = typeof fetch;

export async function sendPulse(code: string, answer: PulseAnswer, token: string, fetchImpl: Fetch = fetch): Promise<boolean> {
  try {
    const response = await fetchImpl("/api/programme/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, answer })
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}
