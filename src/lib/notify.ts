/**
 * A heads-up to the team that an organisation has written in, so a clinic that
 * sends an enquiry is not left waiting for someone to think of opening the
 * Firebase console.
 *
 * Optional: with no `ENQUIRY_WEBHOOK_URL` nothing is sent. The URL is a secret
 * (anyone who has it can post to the team's channel): it lives only in the
 * server's environment, is never logged, and must be https.
 *
 * The message carries NO personal details. Not the name, the email, the
 * organisation or what they wrote: only that an enquiry of a given kind arrived
 * and where to read it. Those details stay in the database, which is what the
 * privacy policy describes. A chat service never receives them.
 *
 * It can never get in the way of an enquiry: a failure here is reported to the
 * server log (without the URL) and the enquiry has already been saved.
 */
import { ORG_TYPE_LABELS, type OrgType } from "@/lib/partners";

export type Notice = {
  /** Slack and most chat tools read `text`. */
  text: string;
  /** Discord reads `content`. Sent as well, so one URL works with either. */
  content: string;
};

/** What the team is told. Built only from the kind of organisation, never from what was typed. */
export function enquiryNotice(orgType: OrgType): Notice {
  const message = `New organisation enquiry (${ORG_TYPE_LABELS[orgType]}). Read and reply in the Firebase console: Firestore, partnerEnquiries.`;
  return { text: message, content: message };
}

export type NotifyResult = "sent" | "skipped" | "failed";

/** Post a notice to the team's webhook, if one is set. Never throws. */
export async function notifyTeam(
  notice: Notice,
  options: { url?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<NotifyResult> {
  const url = options.url ?? process.env.ENQUIRY_WEBHOOK_URL;
  if (!url) return "skipped";

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    console.error("[notify] ENQUIRY_WEBHOOK_URL is not a valid address; no alert sent");
    return "failed";
  }
  if (target.protocol !== "https:") {
    console.error("[notify] ENQUIRY_WEBHOOK_URL must be https; no alert sent");
    return "failed";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 2500);
  try {
    const response = await (options.fetchImpl ?? fetch)(target.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notice),
      signal: controller.signal
    });
    if (!response.ok) {
      console.error(`[notify] the alert service answered ${response.status}`);
      return "failed";
    }
    return "sent";
  } catch (error) {
    // The message only, never the address: it is a secret.
    console.error("[notify] could not reach the alert service:", error instanceof Error ? error.name : "unknown error");
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}
