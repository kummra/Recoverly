import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { LOCALES } from "@/lib/i18n/types";
import { MIN_GROUP, ROUND_TO } from "@/lib/programme-count";
import { SHARE_EXPIRY_HOURS, SHARE_LIMITS } from "@/lib/share";

/**
 * The privacy policy says what the code does, in numbers a person will rely on. If the
 * code changes and the policy does not, a promise has quietly become false, so these
 * fail instead. They are the other half of the two exceptions to firm rule 4 (CLAUDE.md):
 * a summary link a person makes and can end, and an anonymous monthly total they can
 * choose to be in.
 */
const en = DICTIONARIES.en;
const days = SHARE_EXPIRY_HOURS.map((hours) => hours / 24);

describe("the English policy states what the code does", () => {
  it("names every lifetime a summary link can have", () => {
    expect(en["privacy.s13Body"]).toContain(`${days[0]}, ${days[1]} or ${days[2]} days`);
  });

  it("states how many links a person may have at a time", () => {
    expect(en["privacy.s13Body"]).toContain(`up to ${SHARE_LIMITS.activeMax} links`);
  });

  it("says the summary is encrypted before it is sent, that the key is only in the link, and that we cannot read it", () => {
    const body = en["privacy.s13Body"];
    expect(body).toMatch(/encrypted/);
    expect(body).toMatch(/key .* only in the link/);
    expect(body).toMatch(/cannot read it/);
  });

  it("says a summary never contains the email or account, and nothing is in it unless ticked", () => {
    const body = en["privacy.s13Body"];
    expect(body).toMatch(/unless you tick it/);
    expect(body).toMatch(/email address and account details are never part of it/);
  });

  it("says stopping deletes our copy, and so does deleting the account", () => {
    const body = en["privacy.s13Body"];
    expect(body).toMatch(/deletes our copy straight away/);
    expect(body).toMatch(/Deleting your account deletes the stored copy of every link/);
  });

  it("states the headcount's group size and rounding, that it is optional, and that no list is kept", () => {
    const body = en["privacy.s12Body"];
    expect(body).toContain(`at least ${MIN_GROUP} people`);
    expect(body).toContain(`nearest ${ROUND_TO}`);
    expect(body).toMatch(/only if the programme offers it and you tick the box/);
    expect(body).toMatch(/untick it at any time/);
    expect(body).toMatch(/no list of who was counted/);
    expect(body).toMatch(/nothing you log is sent/);
    expect(body).toMatch(/once a month/);
  });

  it("still says an organisation is not told that a person joined, or what they log", () => {
    expect(en["privacy.s12Body"]).toMatch(/not told that you joined, and cannot see anything you log/);
  });

  it("points the two general sections at the two exceptions, so no section says 'never' without them", () => {
    expect(en["privacy.s1Body"]).toMatch(/share a summary/);
    expect(en["privacy.s1Body"]).toMatch(/anonymous total/);
    expect(en["privacy.s5Body"]).toMatch(/summary link/);
    expect(en["privacy.s5Body"]).toMatch(/anonymous total/);
    expect(en["faq.a3"]).toMatch(/unless you choose to share a summary or to be counted/);
    expect(en["login.privateBody"]).toMatch(/unless you choose to share a summary/);
  });

  it("the policy page lists the sharing section", () => {
    const source = readFileSync(join(process.cwd(), "src/components/privacy-content.tsx"), "utf8");
    expect(source).toContain('"privacy.s13Title"');
    expect(source).toContain('"privacy.s13Body"');
  });
});

describe("every translation of the policy states the same numbers", () => {
  for (const locale of LOCALES) {
    it(`${locale}: programme total (${MIN_GROUP}, ${ROUND_TO}) and summary links (${days.join(", ")} days, ${SHARE_LIMITS.activeMax} links)`, () => {
      const dict = DICTIONARIES[locale];
      const headcount = dict["privacy.s12Body"];
      expect(headcount, `${locale} s12`).toContain(String(MIN_GROUP));
      expect(headcount, `${locale} s12`).toMatch(new RegExp(`(^|[^0-9])${ROUND_TO}([^0-9]|$)`));
      const sharing = dict["privacy.s13Body"];
      expect(sharing, `${locale} s13`).toContain(`${days[0]}, ${days[1]}`);
      expect(sharing, `${locale} s13`).toMatch(new RegExp(`(^|[^0-9])${days[2]}([^0-9]|$)`));
      expect(sharing, `${locale} s13`).toMatch(new RegExp(`(^|[^0-9])${SHARE_LIMITS.activeMax}([^0-9]|$)`));
      // The counted-programme sentence also states the group size.
      expect(dict["programme.privateCounted"], `${locale} privateCounted`).toContain(String(MIN_GROUP));
      expect(dict["programme.countHelp"], `${locale} countHelp`).toContain(String(MIN_GROUP));
      expect(dict["programme.countHelp"], `${locale} countHelp`).toMatch(new RegExp(`(^|[^0-9])${ROUND_TO}([^0-9]|$)`));
    });
  }
});

describe("the choices on screen say what the policy says", () => {
  it("offers the same three lifetimes the policy names", () => {
    expect(days).toEqual([1, 7, 30]);
    expect(en["share.expiry1"]).toBe("1 day");
    expect(en["share.expiry7"]).toBe("7 days");
    expect(en["share.expiry30"]).toBe("30 days");
  });

  it("tells a person with a programme that offers the headcount that it is their choice and can be turned off", () => {
    expect(en["programme.countHelp"]).toMatch(/turn this off any time in Settings/);
    expect(en["programme.privateCounted"]).toMatch(/If you choose to be counted/);
  });

  it("tells a programme without the headcount that it sees nothing at all", () => {
    expect(en["programme.private"]).toMatch(/cannot see that you joined, what you log, or anything else about you/);
  });
});
