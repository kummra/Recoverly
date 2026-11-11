import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  add: vi.fn(async () => ({ id: "new-doc" })),
  feedbackCollection: vi.fn(),
  doc: vi.fn(),
  collection: vi.fn(),
  verifyIdToken: vi.fn(),
  configured: true
}));

vi.mock("@/lib/firebase-admin", () => ({
  get adminDb() {
    return mocks.configured ? { collection: mocks.collection } : null;
  },
  get adminAuth() {
    return mocks.configured ? { verifyIdToken: mocks.verifyIdToken } : null;
  },
  get isAdminConfigured() {
    return mocks.configured;
  }
}));

import { POST } from "@/app/api/feedback/route";

let counter = 0;
/** A distinct signed-in person each time, so the in-memory rate limit does not carry over. */
function post(body: unknown, opts: { token?: string | null; uid?: string } = {}) {
  counter += 1;
  const uid = opts.uid ?? `user-${counter}`;
  mocks.verifyIdToken.mockImplementation(async (token: string) => {
    if (token !== "good-token") throw new Error("bad token");
    return { uid };
  });
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.token !== null) headers.authorization = `Bearer ${opts.token ?? "good-token"}`;
  return POST(new NextRequest("https://recoverly.co.in/api/feedback", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) }));
}

beforeEach(() => {
  mocks.configured = true;
  mocks.add.mockClear();
  mocks.collection.mockReset();
  mocks.doc.mockReset();
  mocks.feedbackCollection.mockReset();
  mocks.collection.mockReturnValue({ doc: mocks.doc });
  mocks.doc.mockReturnValue({ collection: mocks.feedbackCollection });
  mocks.feedbackCollection.mockReturnValue({ add: mocks.add });
});

describe("POST /api/feedback", () => {
  it("stores the answer under the signed-in person's own account", async () => {
    const res = await post({ interests: ["counsellor", "group"], message: "In Tamil please" }, { uid: "abc123" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mocks.collection).toHaveBeenCalledWith("users");
    expect(mocks.doc).toHaveBeenCalledWith("abc123");
    expect(mocks.feedbackCollection).toHaveBeenCalledWith("feedback");
    const stored = (mocks.add.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(stored).toMatchObject({ interests: ["counsellor", "group"], message: "In Tamil please" });
    expect(stored.createdAt).toBeInstanceOf(Date);
    expect(Object.keys(stored).sort()).toEqual(["createdAt", "interests", "message"]);
  });

  it("turns away someone who is not signed in, or whose token is no good", async () => {
    expect((await post({ interests: ["group"] }, { token: null })).status).toBe(401);
    expect((await post({ interests: ["group"] }, { token: "expired" })).status).toBe(401);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("refuses an answer that says nothing, and a choice that is not offered", async () => {
    expect((await post({ interests: [] })).status).toBe(400);
    expect((await post({ interests: ["free-money"] })).status).toBe(400);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("refuses something that is not JSON, and one that is too large", async () => {
    expect((await post("{not json")).status).toBe(400);
    expect((await post({ interests: ["group"], message: "x".repeat(10_000) })).status).toBe(413);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("limits how often one person can send", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) statuses.push((await post({ interests: ["group"] }, { uid: "same-person" })).status);
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it("says so, rather than pretending, when the database is not set up", async () => {
    mocks.configured = false;
    expect((await post({ interests: ["group"] })).status).toBe(503);
  });

  it("does not leak what went wrong when storing fails", async () => {
    mocks.add.mockRejectedValueOnce(new Error("PERMISSION_DENIED: secret detail"));
    const res = await post({ interests: ["group"] });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
