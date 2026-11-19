/**
 * Sending the monthly report email through Resend's HTTP API (plain `fetch`, no package). Configured by two environment variables the owner
 * sets: `RESEND_API_KEY` and `REPORTS_FROM_EMAIL` (an address on a domain verified in Resend, such as `Recoverly <reports@recoverly.co.in>`).
 * Without both it is simply off: `resendMailer` answers `null` and the job says so. Never tested against Resend itself: that needs the owner's key.
 */
import type { ReportMailer } from "@/lib/org/reports";

type Env = Record<string, string | undefined>;

const FROM = /^[^<>\r\n]{0,60}<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>$|^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

export function resendMailer(env: Env = process.env, fetchImpl: typeof fetch = fetch): ReportMailer | null {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.REPORTS_FROM_EMAIL?.trim();
  if (!key || !from || !FROM.test(from)) return null;
  return async ({ to, subject, text }) => {
    try {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text })
      });
      return response.ok;
    } catch {
      return false;
    }
  };
}
