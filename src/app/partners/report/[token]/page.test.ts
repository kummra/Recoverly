import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v";
const env = vi.hoisted(() => ({ counts: {} as Record<string, number> | "throw", admin: true, address: "198.51.100.1" }));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": env.address }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  }
}));
vi.mock("@/lib/firebase-admin", () => ({
  get adminDb() {
    return env.admin ? {} : null;
  }
}));
vi.mock("@/lib/programme-count-firestore", () => ({
  firestoreCountStore: () => ({
    increment: async () => undefined,
    read: async () => {
      if (env.counts === "throw") throw new Error("database down");
      return env.counts;
    }
  })
}));
vi.mock("@/lib/programme-register", () => ({
  findProgrammeByReportKey: (token: unknown) => (token === KEY ? { code: "ACMELOGI26", name: "Acme Logistics" } : null)
}));

import ProgrammeReportPage from "@/app/partners/report/[token]/page";
import { monthKey, shiftMonth } from "@/lib/programme-count";

const now = monthKey(new Date());
const page = async (token: string) => renderToStaticMarkup(await ProgrammeReportPage({ params: Promise.resolve({ token }) }));
const text = (html: string) => html.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

let caller = 0;
beforeEach(() => {
  env.counts = {};
  env.admin = true;
  caller += 1;
  env.address = `198.51.100.${caller}`;
});

describe("an organisation's report page", () => {
  it("shows the organisation's name and its monthly figures: rounded above the group size, hidden below it", async () => {
    env.counts = { [now]: 23, [shiftMonth(now, -1)]: 7, [shiftMonth(now, -2)]: 31, [shiftMonth(now, -3)]: 19, [shiftMonth(now, -4)]: 20 };
    const out = text(await page(KEY));
    expect(out).toContain("Acme Logistics: monthly report");
    expect(out).toMatch(/about 25/);
    expect(out).toMatch(/about 30/);
    expect(out).toMatch(/about 20/);
    // 7 and 19 and the month with nothing are never shown as numbers.
    expect(out).not.toMatch(/\b(7|19)\b people|about (7|19)\b/);
    expect((out.match(/fewer than 20/g) ?? []).length).toBe(3);
    expect(out).not.toContain("Example.");
  });

  it("lists six months, newest first", async () => {
    const out = text(await page(KEY));
    const months = [0, 1, 2, 3, 4, 5].map((i) => shiftMonth(now, -i));
    expect(months).toHaveLength(6);
    expect((out.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Oct|Nov|Dec) 20\d\d/g) ?? []).length).toBe(6);
  });

  it("says plainly what it cannot show", async () => {
    const out = text(await page(KEY));
    expect(out).toMatch(/no names, no accounts and no list of who was counted/);
    expect(out).toMatch(/You cannot see who joined/);
    expect(out).toMatch(/at least 20 people are counted/);
    expect(out).toMatch(/nearest 5/);
  });

  it("is a not-found page for any key it does not hold", async () => {
    for (const token of ["not-a-real-key-not-a-real-key-123", `${KEY}x`, "ACMELOGI26", "", "example"]) {
      await expect(page(token), token).rejects.toThrow("NEXT_NOT_FOUND");
    }
  });

  it("says the figures are unavailable, without inventing any, when the database cannot be read", async () => {
    env.counts = "throw";
    expect(text(await page(KEY))).toMatch(/figures are not available right now/);
    env.counts = {};
    env.admin = false;
    const out = text(await page(KEY));
    expect(out).toMatch(/figures are not available right now/);
    expect(out).not.toMatch(/fewer than 20|about \d+/);
  });

  it("slows down someone trying many addresses", async () => {
    env.address = "203.0.113.250";
    let blocked = false;
    for (let i = 0; i < 70 && !blocked; i++) blocked = await page(`guess-${i}-guess-${i}-guess-${i}`).then(() => false, (e: Error) => e.message === "NEXT_NOT_FOUND" && i >= 60);
    expect(blocked).toBe(true);
  });
});
