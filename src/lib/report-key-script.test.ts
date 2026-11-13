import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { type RegisterEntry, hashReportKey, matchReportKey } from "@/lib/programme-register";

/**
 * The procedure in the register's header and in docs/deploy-checklist.md: run the script, paste the
 * line into an entry, send the organisation the link. This runs it for real and checks the pieces
 * fit, so the instructions cannot quietly stop working.
 */
function runScript() {
  const out = execFileSync("node", [join(process.cwd(), "scripts/make-report-key.mjs")], { encoding: "utf8" });
  const token = /\/partners\/report\/([A-Za-z0-9_-]+)/.exec(out)?.[1] ?? "";
  const line = /^\s*(report: \{ keyHash: "[0-9a-f]{64}" \},)$/m.exec(out)?.[1] ?? "";
  return { out, token, line, hash: /keyHash: "([0-9a-f]{64})"/.exec(line)?.[1] ?? "" };
}

describe("scripts/make-report-key.mjs", () => {
  it("prints a link and a register line that belong together", () => {
    const { token, hash, line } = runScript();
    expect(token).toHaveLength(43);
    expect(line).not.toBe("");
    expect(hashReportKey(token)).toBe(hash);
  });

  it("makes a key the register accepts, and only for the entry it was pasted into", () => {
    const first = runScript();
    const second = runScript();
    const entry = (code: string, hash: string): RegisterEntry => ({ code, name: code, kind: "workplace", welcome: { en: "Welcome, everyone." }, contacts: [], report: { keyHash: hash } });
    const entries = [entry("ONEORG2026", first.hash), entry("TWOORG2026", second.hash)];
    expect(matchReportKey(entries, first.token)?.code).toBe("ONEORG2026");
    expect(matchReportKey(entries, second.token)?.code).toBe("TWOORG2026");
  });

  it("never prints the same key twice", () => {
    expect(runScript().token).not.toBe(runScript().token);
  });

  it("puts nothing secret in a file: the key is on the terminal only", () => {
    const { out } = runScript();
    expect(out).toMatch(/shown only now/);
  });
});
