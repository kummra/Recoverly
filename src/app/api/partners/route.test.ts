import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  add: vi.fn(async () => ({ id: "new-doc" })),
  collection: vi.fn(),
  configured: true
}));

vi.mock("@/lib/firebase-admin", () => ({
  get adminDb() {
    return db.configured ? { collection: db.collection } : null;
  },
  get isAdminConfigured() {
    return db.configured;
  }
}));

import { POST } from "@/app/api/partners/route";

const valid = {
  name: "Asha Rao",
  email: "asha@example.org",
  organisation: "Sunrise Centre",
  orgType: "clinic",
  consent: true
};

let counter = 0;
/** A distinct caller each time, so the in-memory rate limit does not carry over. */
function post(body: unknown, headers: Record<string, string> = {}) {
  counter += 1;
  return POST(
    new NextRequest("https://recoverly.co.in/api/partners", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "recoverly.co.in",
        "x-forwarded-for": `203.0.113.${counter}`,
        ...headers
      },
      body: typeof body === "string" ? body : JSON.stringify(body)
    })
  );
}

beforeEach(() => {
  db.configured = true;
  db.add.mockClear();
  db.collection.mockReset();
  db.collection.mockReturnValue({ add: db.add });
});

describe("POST /api/partners", () => {
  it("stores a valid enquiry in the server-only collection", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.collection).toHaveBeenCalledWith("partnerEnquiries");
    expect(db.add).toHaveBeenCalledTimes(1);
    const stored = (db.add.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(stored).toMatchObject({ name: "Asha Rao", email: "asha@example.org", orgType: "clinic", source: "partners-page" });
    expect(stored.deleteAt).toBeInstanceOf(Date);
  });

  it("tells a bot it worked and keeps nothing", async () => {
    const res = await post({ ...valid, website: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.add).not.toHaveBeenCalled();
  });

  it("names the fields that are wrong and stores nothing", async () => {
    const res = await post({ ...valid, email: "nope", consent: false });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect([...body.fields].sort()).toEqual(["consent", "email"]);
    expect(db.add).not.toHaveBeenCalled();
  });

  it("does not store fields it does not know", async () => {
    await post({ ...valid, isAdmin: true, createdAt: "2001-01-01" });
    const stored = (db.add.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(stored).not.toHaveProperty("isAdmin");
    expect(stored.createdAt).not.toBe("2001-01-01");
  });

  it("refuses a request that came from another site", async () => {
    const res = await post(valid, { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(db.add).not.toHaveBeenCalled();
  });

  it("accepts a request from its own pages", async () => {
    const res = await post(valid, { origin: "https://recoverly.co.in" });
    expect(res.status).toBe(200);
  });

  it("refuses something that is not JSON, and a body that is too big", async () => {
    expect((await post(valid, { "content-type": "text/plain" })).status).toBe(415);
    expect((await post("{not json")).status).toBe(400);
    expect((await post(JSON.stringify({ ...valid, message: "x".repeat(20_000) }))).status).toBe(413);
    expect(db.add).not.toHaveBeenCalled();
  });

  it("limits how often one caller can send", async () => {
    const headers = { "x-forwarded-for": "198.51.100.7" };
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) statuses.push((await post(valid, headers)).status);
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it("says so, rather than pretending, when the database is not set up", async () => {
    db.configured = false;
    const res = await post(valid);
    expect(res.status).toBe(503);
  });

  it("does not leak what went wrong when storing fails", async () => {
    db.add.mockRejectedValueOnce(new Error("PERMISSION_DENIED: secret detail"));
    const res = await post(valid);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
