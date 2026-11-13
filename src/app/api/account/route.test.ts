import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ order: [] as string[], configured: true, verified: true }));

vi.mock("@/lib/firebase-admin", () => ({
  get isAdminConfigured() {
    return calls.configured;
  },
  get adminAuth() {
    return calls.configured
      ? {
          verifyIdToken: async () => {
            if (!calls.verified) throw new Error("bad token");
            return { uid: "uid-leaving" };
          },
          deleteUser: async (uid: string) => void calls.order.push(`auth:${uid}`)
        }
      : null;
  },
  get adminDb() {
    return calls.configured
      ? {
          collection: (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}` }) }),
          recursiveDelete: async (ref: { path: string }) => void calls.order.push(`user-data:${ref.path}`)
        }
      : null;
  }
}));
vi.mock("@/lib/oracle-storage", () => ({ deleteAllUserData: async (uid: string) => void calls.order.push(`oracle:${uid}`) }));
vi.mock("@/lib/share-firestore", () => ({
  firestoreShareStore: () => ({
    deleteByOwner: async (uid: string) => {
      calls.order.push(`shares:${uid}`);
      return 2;
    }
  })
}));
vi.mock("@/lib/workspace-firestore", () => ({
  firestoreWorkspaceStore: () => ({
    deleteByOwner: async (uid: string) => {
      calls.order.push(`workspace:${uid}`);
      return 1;
    }
  })
}));

import { DELETE } from "@/app/api/account/route";

let counter = 0;
function del() {
  counter += 1;
  return DELETE(new NextRequest("https://recoverly.co.in/api/account", { method: "DELETE", headers: { authorization: "Bearer t", "x-forwarded-for": `10.1.0.${counter}` } }));
}

beforeEach(() => {
  calls.order.length = 0;
  calls.configured = true;
  calls.verified = true;
});

describe("DELETE /api/account", () => {
  it("deletes the person's data, every summary link they made, every copy they shared with a team, the mirror, and then the sign-in itself", async () => {
    const res = await del();
    expect(res.status).toBe(200);
    // The links and the team copies go before the account does, so a failure part-way never leaves one behind a deleted person.
    expect(calls.order).toEqual(["user-data:users/uid-leaving", "shares:uid-leaving", "workspace:uid-leaving", "oracle:uid-leaving", "auth:uid-leaving"]);
  });

  it("does nothing for someone who is not signed in", async () => {
    calls.verified = false;
    expect((await del()).status).toBe(401);
    expect(calls.order).toEqual([]);
  });

  it("says so when the server is not set up, rather than half-deleting", async () => {
    calls.configured = false;
    expect((await del()).status).toBe(500);
    expect(calls.order).toEqual([]);
  });
});
