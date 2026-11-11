import { describe, expect, it } from "vitest";

import {
  MAX_PERSON_NAME,
  cleanPersonName,
  normalisePhone,
  parsePerson,
  personStorageKey,
  smsHref,
  telHref,
  validatePerson
} from "@/lib/support-person";

describe("normalisePhone", () => {
  it("keeps the digits of a number typed the way people type them", () => {
    expect(normalisePhone("98765 43210")).toBe("9876543210");
    expect(normalisePhone("(022) 2345-6789")).toBe("02223456789");
    expect(normalisePhone("98765.43210")).toBe("9876543210");
    expect(normalisePhone("  9876543210  ")).toBe("9876543210");
  });

  it("keeps a leading + for a country code", () => {
    expect(normalisePhone("+91 98765 43210")).toBe("+919876543210");
  });

  it("refuses what cannot be dialled", () => {
    for (const bad of ["", "abc", "98a7654321", "12345", "1234567890123456", "98765 43210 ext 5", "+", "++919876543210", null, undefined, 9876543210]) {
      expect(normalisePhone(bad as never), String(bad)).toBeNull();
    }
  });

  it("accepts the shortest and longest real numbers", () => {
    expect(normalisePhone("1234567")).toBe("1234567");
    expect(normalisePhone("123456789012345")).toBe("123456789012345");
  });
});

describe("cleanPersonName", () => {
  it("tidies spaces and cuts to length", () => {
    expect(cleanPersonName("  Asha   Rao ")).toBe("Asha Rao");
    expect(cleanPersonName("x".repeat(100)).length).toBe(MAX_PERSON_NAME);
    expect(cleanPersonName(42)).toBe("");
  });
});

describe("validatePerson", () => {
  it("returns the person, tidied", () => {
    expect(validatePerson({ name: " Asha ", phone: "98765 43210" })).toEqual({ ok: true, person: { name: "Asha", phone: "9876543210" } });
  });

  it("says what is wrong, name first", () => {
    expect(validatePerson({ name: "", phone: "9876543210" })).toEqual({ ok: false, problem: "name" });
    expect(validatePerson({ name: "Asha", phone: "12" })).toEqual({ ok: false, problem: "phone" });
    expect(validatePerson({ name: "", phone: "12" })).toEqual({ ok: false, problem: "name" });
  });
});

describe("parsePerson: storage may be empty, damaged or edited by hand", () => {
  it("reads what was saved", () => {
    expect(parsePerson(JSON.stringify({ name: "Asha", phone: "9876543210" }))).toEqual({ name: "Asha", phone: "9876543210" });
  });

  it("is null for anything that is not a usable person", () => {
    for (const raw of [null, "", "not json", "[]", "null", "42", JSON.stringify({}), JSON.stringify({ name: "Asha" }), JSON.stringify({ name: "", phone: "9876543210" }), JSON.stringify({ name: "Asha", phone: "<script>" })]) {
      expect(parsePerson(raw), String(raw)).toBeNull();
    }
  });

  it("never lets a stored value become something other than a plain number", () => {
    const stored = parsePerson(JSON.stringify({ name: "Asha", phone: "9876543210;rm" }));
    expect(stored).toBeNull();
  });
});

describe("links", () => {
  const person = { name: "Asha", phone: "+919876543210" };

  it("builds a dial link", () => {
    expect(telHref(person)).toBe("tel:+919876543210");
  });

  it("builds a message link with the text encoded", () => {
    expect(smsHref(person, "Hi — can we talk? 100%")).toBe("sms:+919876543210?&body=Hi%20%E2%80%94%20can%20we%20talk%3F%20100%25");
  });
});

describe("storage key", () => {
  it("is per person using the app, so a shared phone keeps them apart", () => {
    expect(personStorageKey("u1")).not.toBe(personStorageKey("u2"));
    expect(personStorageKey("u1")).toBe("recoverly:person:u1");
  });
});
