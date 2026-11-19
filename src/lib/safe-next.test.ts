import { describe, expect, it } from "vitest";

import { loginPathFor, safeNextPath } from "@/lib/safe-next";

describe("where a sign-in may send someone next", () => {
  it("allows the organisation pages, with a query or a fragment", () => {
    for (const path of ["/portal", "/portal?checkout=success&session_id=cs_test_1", "/pricing", "/owner", "/partners/toolkit/manager-guide", "/partners/toolkit/poster?code=ABC", "/portal#plans"]) {
      expect(safeNextPath(path), path).toBe(path);
    }
  });

  it("refuses another site, a path that escapes, a script address and anything not on the list", () => {
    for (const bad of ["https://evil.example/portal", "//evil.example/portal", "/\\evil.example", "/portal/../../x", "javascript:alert(1)", "/dashboard", "/settings", "/api/org", "/portalx", "", " /portal", "/partners/../login", "/portal\n/x", "/" + "a".repeat(400)]) {
      expect(safeNextPath(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });

  it("builds the sign-in address for a page that needs one, and a plain one otherwise", () => {
    expect(loginPathFor("/partners/toolkit/manager-guide")).toBe("/login?next=%2Fpartners%2Ftoolkit%2Fmanager-guide");
    expect(loginPathFor("/dashboard")).toBe("/login");
    expect(loginPathFor(null)).toBe("/login");
  });
});
