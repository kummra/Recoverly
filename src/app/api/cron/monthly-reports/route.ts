import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { resendMailer } from "@/lib/org/mailer";
import { sendMonthlyReports } from "@/lib/org/reports";
import { orgStore, siteUrl } from "@/lib/org/server";
import { firestoreCountStore } from "@/lib/programme-count-firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function authorised(request: NextRequest, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The monthly report email job, run by Vercel Cron on the second of each month (`vercel.json`). Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` when the `CRON_SECRET` environment variable is set; anything else is refused, so nobody can
 * trigger it from outside. It answers only counts: how many organisations were looked at, sent, skipped and failed.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return reply({ error: "unavailable" }, 503);
  if (!authorised(request, secret)) return reply({ error: "unauthorized" }, 401);
  if (!orgStore || !adminDb) return reply({ error: "unavailable" }, 503);
  const mail = resendMailer();
  if (!mail) return reply({ skipped: "email is not set up" });

  try {
    const summary = await sendMonthlyReports({ store: orgStore, counts: firestoreCountStore(adminDb), mail, now: new Date(), portalUrl: `${siteUrl()}/portal` });
    // Counts only: never an address, a name or a figure.
    // eslint-disable-next-line no-console
    console.log("[cron monthly-reports]", JSON.stringify(summary));
    return reply(summary);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[cron monthly-reports]", error instanceof Error ? error.message : "unknown error");
    return reply({ error: "unavailable" }, 500);
  }
}
