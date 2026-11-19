import { describe, expect, it } from "vitest";

import { checkProgrammeContent } from "@/lib/org/content";
import { PROGRAMME_LIMITS } from "@/lib/programme";

const good = { name: "Acme depot", welcome: { en: "Welcome to the Acme programme. You are not alone." }, contacts: [{ label: "Employee assistance line", phone: "+91 98765 43210", hours: "Mon to Sat, 9 to 6" }] };
const errorsOf = (input: unknown) => checkProgrammeContent(input).errors.join(" | ");

describe("what an organisation may write for its people", () => {
  it("accepts good words and cleans them (a number is written plainly, spaces are tidied)", () => {
    const { content, errors } = checkProgrammeContent({ ...good, name: "  Acme   depot " });
    expect(errors).toEqual([]);
    expect(content).toMatchObject({ name: "Acme depot", contacts: [{ label: "Employee assistance line", phone: "+919876543210" }] });
  });

  it("says exactly what is wrong with the name and the welcome", () => {
    expect(errorsOf({ ...good, name: "A" })).toMatch(/name of at least 2/);
    expect(errorsOf({ ...good, name: "x".repeat(300) })).toMatch(/name is too long/);
    expect(errorsOf({ ...good, welcome: {} })).toMatch(/Write a welcome in English/);
    expect(errorsOf({ ...good, welcome: { en: "short" } })).toMatch(/too short/);
    expect(errorsOf({ ...good, welcome: { en: good.welcome.en, hi: "x".repeat(900) } })).toMatch(/hi welcome is too long/);
    expect(errorsOf(null)).toMatch(/Nothing was sent/);
  });

  it("refuses a contact that cannot be reached, with a number, address or link that does not work", () => {
    expect(errorsOf({ ...good, contacts: [{ label: "Line", phone: "12" }] })).toMatch(/Contact 1: the phone number must be 3 to 15 digits/);
    expect(errorsOf({ ...good, contacts: [{ label: "Web", url: "http://insecure.example" }] })).toMatch(/Contact 1: the link must be a complete address starting with https/);
    expect(errorsOf({ ...good, contacts: [{ label: "Mail", email: "not an address" }] })).toMatch(/Contact 1: that is not a valid email/);
    expect(errorsOf({ ...good, contacts: [{ label: "Nobody" }] })).toMatch(/Contact 1 needs a phone number, an email address or a link/);
    expect(errorsOf({ ...good, contacts: [{ phone: "9876543210" }] })).toMatch(/Contact 1 needs a label/);
  });

  it("ignores empty rows, and stops at the most contacts allowed", () => {
    expect(checkProgrammeContent({ ...good, contacts: [{}, { label: "", phone: "" }, good.contacts[0]] }).errors).toEqual([]);
    const many = Array.from({ length: PROGRAMME_LIMITS.contactsMax + 1 }, (_, i) => ({ label: `Line ${i}`, phone: "9876543210" }));
    expect(errorsOf({ ...good, contacts: many })).toMatch(/At most 4 support contacts/);
  });

  it("refuses the retired helpline number, in any way it is written, for a contact or a referral", () => {
    const retired = ["1800", "599", "0019"];
    for (const written of [retired.join(""), retired.join("-"), retired.join(" "), `+91 ${retired.join("")}`]) {
      expect(errorsOf({ ...good, contacts: [{ label: "Old line", phone: written }] }), written).toMatch(/helpline was retired/);
      expect(errorsOf({ ...good, referrals: [{ name: "Old line", phone: written }] }), written).toMatch(/Referral 1: that helpline was retired/);
    }
  });

  it("checks the ready-made plans and the check-in questions", () => {
    expect(errorsOf({ ...good, plans: [{ when: "I feel the urge", then: "" }] })).toMatch(/Plan 1 needs both a "when" and a "then"/);
    expect(errorsOf({ ...good, plans: Array.from({ length: 4 }, () => ({ when: "a", then: "b" })) })).toMatch(/At most 3 ready-made plans/);
    expect(errorsOf({ ...good, questions: ["a", "b", "c", "d"] })).toMatch(/At most 3 check-in questions/);
    expect(errorsOf({ ...good, locale: "xx" })).toMatch(/not a language we support/);
  });
});

describe("the list of local referrals", () => {
  it("takes a name with a place, a number or a page, and keeps them cleaned", () => {
    const { content, errors } = checkProgrammeContent({
      ...good,
      referrals: [
        { name: "District de-addiction centre", place: "Civil Lines, Pune", phone: "020 2555 0100", hours: "Mon to Sat" },
        { name: "Peer meeting", url: "https://meetings.example/pune" },
        { name: "Government hospital", place: "Station Road" },
        {}
      ]
    });
    expect(errors).toEqual([]);
    expect(content?.referrals).toEqual([
      { name: "District de-addiction centre", place: "Civil Lines, Pune", phone: "02025550100", hours: "Mon to Sat" },
      { name: "Peer meeting", url: "https://meetings.example/pune" },
      { name: "Government hospital", place: "Station Road" }
    ]);
  });

  it("says what is wrong with a referral", () => {
    expect(errorsOf({ ...good, referrals: [{ place: "Station Road" }] })).toMatch(/Referral 1 needs a name/);
    expect(errorsOf({ ...good, referrals: [{ name: "Centre" }] })).toMatch(/Referral 1 needs a place, a phone number or a link/);
    expect(errorsOf({ ...good, referrals: [{ name: "Centre", phone: "5" }] })).toMatch(/Referral 1: the phone number must be 3 to 15 digits/);
    expect(errorsOf({ ...good, referrals: [{ name: "Centre", url: "javascript:alert(1)" }] })).toMatch(/Referral 1: the link must be a complete address starting with https/);
    expect(errorsOf({ ...good, referrals: [{ name: "Centre", place: "x".repeat(300) }] })).toMatch(/place is too long/);
    const many = Array.from({ length: PROGRAMME_LIMITS.referralsMax + 1 }, (_, i) => ({ name: `Place ${i}`, place: "Somewhere" }));
    expect(errorsOf({ ...good, referrals: many })).toMatch(/At most 8 local referrals/);
  });

  it("is simply absent when none are given", () => {
    expect(checkProgrammeContent(good).content).not.toHaveProperty("referrals");
    expect(checkProgrammeContent({ ...good, referrals: [{}, {}] }).content).not.toHaveProperty("referrals");
  });
});
