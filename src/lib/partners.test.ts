import { describe, expect, it } from "vitest";

import {
  MAX_MESSAGE_LENGTH,
  ORG_TYPES,
  ORG_TYPE_LABELS,
  enquiryToDocument,
  isHoneypotTripped,
  parseEnquiry
} from "@/lib/partners";

const valid = {
  name: "Asha Rao",
  email: "Asha.Rao@Example.org",
  organisation: "Sunrise De-addiction Centre",
  orgType: "clinic",
  role: "Medical director",
  message: "We would like to talk about follow-up after discharge.",
  consent: true
};

describe("parseEnquiry", () => {
  it("accepts a complete enquiry and tidies the email", () => {
    const parsed = parseEnquiry({ ...valid, name: "  Asha Rao  " });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.email).toBe("asha.rao@example.org");
      expect(parsed.data.name).toBe("Asha Rao");
    }
  });

  it("treats empty optional boxes as not given", () => {
    const parsed = parseEnquiry({ ...valid, role: "", message: "   " });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.role).toBeUndefined();
      expect(parsed.data.message).toBeUndefined();
    }
  });

  it("refuses an enquiry without consent, however it is phrased", () => {
    for (const consent of [false, undefined, "true", 1, "on"]) {
      const parsed = parseEnquiry({ ...valid, consent });
      expect(parsed.ok, `consent=${String(consent)}`).toBe(false);
      if (!parsed.ok) expect(parsed.fields).toContain("consent");
    }
  });

  it("names the fields that are wrong", () => {
    const parsed = parseEnquiry({ ...valid, email: "not-an-email", name: "A", orgType: "spaceship" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.fields.sort()).toEqual(["email", "name", "orgType"]);
  });

  it("refuses a message over the limit and one just inside it", () => {
    expect(parseEnquiry({ ...valid, message: "x".repeat(MAX_MESSAGE_LENGTH) }).ok).toBe(true);
    expect(parseEnquiry({ ...valid, message: "x".repeat(MAX_MESSAGE_LENGTH + 1) }).ok).toBe(false);
  });

  it("refuses things that are not objects", () => {
    for (const input of [null, undefined, "hello", 42, []]) {
      expect(parseEnquiry(input).ok).toBe(false);
    }
  });

  it("keeps only the fields it knows, so extras cannot be stored", () => {
    const parsed = parseEnquiry({ ...valid, isAdmin: true, createdAt: "2020-01-01", website: "x" });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(Object.keys(parsed.data).sort()).toEqual(["consent", "email", "message", "name", "orgType", "organisation", "role"]);
    }
  });

  it("has a label for every organisation type", () => {
    for (const type of ORG_TYPES) expect(ORG_TYPE_LABELS[type]).toBeTruthy();
  });
});

describe("isHoneypotTripped", () => {
  it("is tripped only when the hidden field has something in it", () => {
    expect(isHoneypotTripped({ ...valid, website: "http://spam.example" })).toBe(true);
    expect(isHoneypotTripped({ ...valid, website: "" })).toBe(false);
    expect(isHoneypotTripped({ ...valid, website: "   " })).toBe(false);
    expect(isHoneypotTripped(valid)).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
  });
});

describe("enquiryToDocument", () => {
  const now = new Date("2026-11-12T10:00:00Z");
  const parsed = parseEnquiry(valid);
  if (!parsed.ok) throw new Error("fixture must be valid");

  it("stores what was typed plus when it came", () => {
    const doc = enquiryToDocument(parsed.data, now);
    expect(doc).toMatchObject({
      name: "Asha Rao",
      email: "asha.rao@example.org",
      orgType: "clinic",
      source: "partners-page",
      createdAt: now
    });
  });

  it("sets no expiry: enquiries are kept as a record until the person asks for them to go", () => {
    expect(enquiryToDocument(parsed.data, now)).not.toHaveProperty("deleteAt");
  });

  it("stores nothing that identifies the visitor beyond what they typed", () => {
    const keys = Object.keys(enquiryToDocument(parsed.data, now)).sort();
    expect(keys).toEqual(["createdAt", "email", "message", "name", "orgType", "organisation", "role", "source"]);
  });

  it("writes null, not undefined, for what was left blank (Firestore rejects undefined)", () => {
    const blank = parseEnquiry({ ...valid, role: "", message: "" });
    if (!blank.ok) throw new Error("fixture must be valid");
    const doc = enquiryToDocument(blank.data, now);
    expect(doc.role).toBeNull();
    expect(doc.message).toBeNull();
  });
});
