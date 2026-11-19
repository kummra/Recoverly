import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ member: null as unknown }));

vi.mock("@/lib/org/member", () => ({ currentMember: async () => env.member }));
// The browser half needs the sign-in context; the gate's own job is only what it shows.
vi.mock("@/components/member-access", () => ({ MemberAccess: ({ returnPath }: { returnPath: string }) => <span data-testid="access">{returnPath}</span> }));

import { MembersGate } from "@/components/members-gate";

const gate = async () =>
  renderToStaticMarkup(
    await MembersGate({
      path: "/partners/toolkit/manager-guide",
      title: "Talking with a colleague",
      summary: "A guide for managers.",
      children: <p>THE SECRET DOCUMENT</p>
    })
  );

beforeEach(() => {
  env.member = null;
});

describe("the members' gate", () => {
  it("shows the document to a member", async () => {
    env.member = { uid: "u1", plan: "workplace" };
    expect(await gate()).toContain("THE SECRET DOCUMENT");
  });

  it("shows everyone else the door, with what the page is and the way in, and not one word of the document", async () => {
    const html = await gate();
    expect(html).not.toContain("THE SECRET DOCUMENT");
    expect(html).toContain("Talking with a colleague");
    expect(html).toContain("A guide for managers.");
    expect(html).toContain("/pricing");
    expect(html).toContain("/portal");
    expect(html).toContain('data-testid="access">/partners/toolkit/manager-guide');
  });

  it("keeps the safety documents open: the door points at them", async () => {
    const html = await gate();
    expect(html).toContain("/partners/toolkit/disclosure-protocol");
    expect(html).toContain("/partners/toolkit/help-a-friend");
    expect(html).toMatch(/free for individuals, always/i);
  });
});
