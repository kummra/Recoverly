import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ ran: 0, mail: true, store: true }));

vi.mock("@/lib/firebase-admin", () => ({ adminDb: {} }));
vi.mock("@/lib/programme-count-firestore", () => ({ firestoreCountStore: () => ({ read: async () => ({}) }) }));
vi.mock("@/lib/org/mailer", () => ({ resendMailer: () => (env.mail ? async () => true : null) }));
vi.mock("@/lib/org/reports", () => ({
  sendMonthlyReports: async () => {
    env.ran += 1;
    return { considered: 2, sent: 1, skipped: 1, failed: 0 };
  }
}));
vi.mock("@/lib/org/server", () => ({
  get orgStore() {
    return env.store ? {} : null;
  },
  siteUrl: () => "https://recoverly.co.in"
}));

import { GET } from "@/app/api/cron/monthly-reports/route";

const SECRET = "cron-secret-0123456789";
const ask = (authorization?: string) => new NextRequest("https://recoverly.co.in/api/cron/monthly-reports", { headers: authorization ? { authorization } : {} });

beforeEach(() => {
  env.ran = 0;
  env.mail = true;
  env.store = true;
  process.env.CRON_SECRET = SECRET;
});

describe("GET /api/cron/monthly-reports", () => {
  it("runs the job for Vercel's cron call, which carries the secret, and answers counts only", async () => {
    const response = await GET(ask(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ considered: 2, sent: 1, skipped: 1, failed: 0 });
    expect(env.ran).toBe(1);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses everyone else, however close, and runs nothing", async () => {
    for (const header of [undefined, "", "Bearer", `Bearer ${SECRET}x`, `bearer ${SECRET}`, SECRET, "Bearer wrong-secret-0123456789"]) {
      expect((await GET(ask(header))).status, String(header)).toBe(401);
    }
    expect(env.ran).toBe(0);
  });

  it("is unavailable, rather than open, without a proper secret, or without a database", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(ask(`Bearer ${SECRET}`))).status).toBe(503);
    process.env.CRON_SECRET = "short";
    expect((await GET(ask("Bearer short"))).status).toBe(503);
    process.env.CRON_SECRET = SECRET;
    env.store = false;
    expect((await GET(ask(`Bearer ${SECRET}`))).status).toBe(503);
    expect(env.ran).toBe(0);
  });

  it("says so, and sends nothing, when email is not set up", async () => {
    env.mail = false;
    const response = await GET(ask(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ skipped: "email is not set up" });
    expect(env.ran).toBe(0);
  });
});
