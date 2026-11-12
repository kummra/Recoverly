import { afterEach, describe, expect, it, vi } from "vitest";

import { ORG_TYPES, enquiryToDocument, type PartnerEnquiry } from "@/lib/partners";
import { enquiryNotice, notifyTeam } from "@/lib/notify";

const URL_OK = "https://hooks.example.test/services/SECRET-TOKEN-123";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("enquiryNotice", () => {
  const enquiry: PartnerEnquiry = {
    name: "Dr Asha Rao",
    email: "asha.rao@clinic.example",
    organisation: "Rao De-addiction Centre",
    orgType: "clinic",
    role: "Director",
    message: "We would like to try this with our outpatients. Please call 98765 43210.",
    consent: true
  };

  it("says what arrived and where to read it", () => {
    const notice = enquiryNotice("clinic");
    expect(notice.text).toContain("Clinic, hospital or de-addiction centre");
    expect(notice.text).toContain("partnerEnquiries");
  });

  it("carries nothing a person typed", () => {
    const sent = JSON.stringify(enquiryNotice(enquiry.orgType));
    const stored = enquiryToDocument(enquiry, new Date());
    for (const value of [stored.name, stored.email, stored.organisation, stored.role, stored.message]) {
      expect(sent).not.toContain(String(value));
    }
    for (const part of ["Asha", "Rao", "clinic.example", "98765", "outpatients"]) expect(sent).not.toContain(part);
  });

  it("works for every kind of organisation, and sends the text under both names", () => {
    for (const type of ORG_TYPES) {
      const notice = enquiryNotice(type);
      expect(notice.text.length).toBeGreaterThan(20);
      expect(notice.content).toBe(notice.text);
    }
  });
});

describe("notifyTeam", () => {
  const notice = enquiryNotice("workplace");
  const ok = () => vi.fn(async () => new Response("ok", { status: 200 }));

  it("does nothing when no webhook is set", async () => {
    vi.stubEnv("ENQUIRY_WEBHOOK_URL", "");
    const fetchImpl = ok();
    expect(await notifyTeam(notice, { fetchImpl })).toBe("skipped");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts the notice as JSON to the address in the environment", async () => {
    vi.stubEnv("ENQUIRY_WEBHOOK_URL", URL_OK);
    const fetchImpl = ok();
    expect(await notifyTeam(notice, { fetchImpl })).toBe("sent");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(URL_OK);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual(notice);
  });

  it("refuses an address that is not https, or not an address, and says nothing to the network", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchImpl = ok();
    expect(await notifyTeam(notice, { url: "http://hooks.example.test/x", fetchImpl })).toBe("failed");
    expect(await notifyTeam(notice, { url: "not a url", fetchImpl })).toBe("failed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports a refusal or a broken connection without throwing, and never logs the secret address", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await notifyTeam(notice, { url: URL_OK, fetchImpl: vi.fn(async () => new Response("no", { status: 500 })) })).toBe("failed");
    expect(await notifyTeam(notice, { url: URL_OK, fetchImpl: vi.fn(async () => Promise.reject(new Error(`boom ${URL_OK}`))) })).toBe("failed");
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("SECRET-TOKEN-123");
  });

  it("gives up on a service that never answers", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const hang = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))));
    expect(await notifyTeam(notice, { url: URL_OK, fetchImpl: hang as unknown as typeof fetch, timeoutMs: 20 })).toBe("failed");
  });
});
