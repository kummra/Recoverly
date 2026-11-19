import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GATED = ["session-outline", "manager-guide", "campaigns", "orientation", "clinic-handout"];
const OPEN = ["disclosure-protocol", "help-a-friend"];
const source = (slug: string) => readFileSync(join(process.cwd(), "src/app/partners/toolkit", slug, "page.tsx"), "utf8");

describe("the toolkit's paywall", () => {
  it("closes each members' document behind the gate, built per request and never as static HTML", () => {
    for (const slug of GATED) {
      const text = source(slug);
      expect(text, slug).toContain("<MembersGate");
      expect(text, slug).toContain('export const dynamic = "force-dynamic"');
      // The document itself is only an element inside the gate, so its words are never rendered for a visitor.
      expect(text, slug).toMatch(/export default function \w+Page\(\) \{\s*return \(\s*<MembersGate/);
      expect(text, slug).not.toMatch(/export default function \w+Page\(\) \{\s*return \(\s*<ToolkitDoc/);
    }
  });

  it("keeps the two safety documents open to everyone", () => {
    for (const slug of OPEN) {
      expect(source(slug), slug).not.toContain("MembersGate");
    }
  });
});
