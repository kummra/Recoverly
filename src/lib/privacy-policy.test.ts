import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { LOCALES } from "@/lib/i18n/types";
import { MIN_GROUP, ROUND_TO } from "@/lib/programme-count";
import { SHARE_EXPIRY_HOURS, SHARE_LIMITS } from "@/lib/share";
import { WORKSPACE_KINDS, WORKSPACE_LIMITS } from "@/lib/workspace";

/**
 * The privacy policy says what the code does, in numbers a person will rely on. If the
 * code changes and the policy does not, a promise has quietly become false, so these
 * fail instead. They are the other half of the exceptions to firm rule 4 (CLAUDE.md):
 * a summary link a person makes and can end, an anonymous monthly total (and two anonymous
 * progress figures) they can choose to be in, and a team workspace at a clinic or
 * community service that they can choose to share with and stop.
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

  it("states the progress figures: two numbers, optional, worked out on the device, shown only for a group, and no list", () => {
    const body = en["privacy.s14Body"];
    expect(body).toMatch(/two figures about your previous month/);
    expect(body).toMatch(/which are never sent/);
    expect(body).toMatch(/only if the programme offers it, you are counted, and you tick that box/);
    expect(body).toMatch(/untick it at any time/);
    expect(body).toContain(`at least ${MIN_GROUP} people`);
    expect(body).toContain(`nearest ${ROUND_TO}`);
    expect(body).toMatch(/no name, no account and no list/);
  });

  it("states the team workspace: only a clinic or community service, never a workplace or a college, off until turned on, scrambled so we cannot read it, ends, and can be stopped", () => {
    const body = en["privacy.s15Body"];
    expect(WORKSPACE_KINDS).toEqual(["clinic", "community"]);
    expect(body).toMatch(/A clinic or community service/);
    expect(body).toMatch(/A workplace or a college never can/);
    expect(body).toMatch(/off unless you turn it on/);
    expect(body).toMatch(/tick that you understand, and press Start sharing/);
    expect(body).toMatch(/only what you tick, never your email or account details/);
    expect(body).toMatch(/encrypted/);
    expect(body).toMatch(/only in the team's own browser/);
    expect(body).toMatch(/cannot read it/);
    expect(body).toContain(`${WORKSPACE_LIMITS.expiryDays} days after you last sent it`);
    expect(body).toMatch(/nothing is sent in the background/);
    expect(body).toMatch(/deletes our copy straight away/);
    expect(body).toMatch(/Leaving the programme in Settings, or deleting your account, does the same/);
    expect(body).toMatch(/cannot be taken back/);
  });

  it("points the general sections at every exception, so no section says 'never' without them", () => {
    expect(en["privacy.s1Body"]).toMatch(/share a summary/);
    expect(en["privacy.s1Body"]).toMatch(/anonymous total/);
    expect(en["privacy.s1Body"]).toMatch(/clinic's team/);
    expect(en["privacy.s5Body"]).toMatch(/summary link/);
    expect(en["privacy.s5Body"]).toMatch(/anonymous total/);
    expect(en["privacy.s5Body"]).toMatch(/sharing with its team/);
    expect(en["faq.a3"]).toMatch(/unless you choose to share a summary, to be counted in an organisation's anonymous total, or to share with a clinic's team/);
    expect(en["login.privateBody"]).toMatch(/unless you choose to share it/);
    expect(en["programme.intro"]).toMatch(/unless you choose to share it/);
  });

  it("the policy page lists the sharing sections", () => {
    const source = readFileSync(join(process.cwd(), "src/components/privacy-content.tsx"), "utf8");
    for (const key of ["s13", "s14", "s15"]) {
      expect(source).toContain(`"privacy.${key}Title"`);
      expect(source).toContain(`"privacy.${key}Body"`);
    }
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
      // The counted-programme sentences also state the group size.
      expect(dict["programme.privateCounted"], `${locale} privateCounted`).toContain(String(MIN_GROUP));
      expect(dict["programme.privateWorkspace"], `${locale} privateWorkspace`).toContain(String(MIN_GROUP));
      // The progress figures: group size and rounding, here and beside the tick.
      for (const key of ["privacy.s14Body", "programme.figuresHelp"]) {
        expect(dict[key], `${locale} ${key}`).toContain(String(MIN_GROUP));
        expect(dict[key], `${locale} ${key}`).toMatch(new RegExp(`(^|[^0-9])${ROUND_TO}([^0-9]|$)`));
      }
      // The team workspace: how long a copy stays readable after it was last sent.
      expect(dict["privacy.s15Body"], `${locale} s15`).toMatch(new RegExp(`(^|[^0-9])${WORKSPACE_LIMITS.expiryDays}([^0-9]|$)`));
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
    expect(en["programme.figuresHelp"]).toMatch(/turn this off any time in Settings/);
  });

  it("tells a person whose programme has a team workspace that only that team can read what they choose to share", () => {
    expect(en["programme.privateWorkspace"]).toMatch(/If you choose to share with their team, only that team can read what you share/);
  });

  it("makes the person tick that they understand before anything is shared with a team, and shows how long it lasts", () => {
    expect(en["workspace.understand"]).toMatch(/I am choosing this myself/);
    expect(en["workspace.activeLine"]).toMatch(/until \{expires\}/);
    expect(en["workspace.stopped"]).toMatch(/deleted/);
  });

  it("tells a programme without the headcount that it sees nothing at all", () => {
    expect(en["programme.private"]).toMatch(/cannot see that you joined, what you log, or anything else about you/);
  });
});
