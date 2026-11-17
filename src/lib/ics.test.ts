import { describe, expect, it } from "vitest";

import { buildAppointmentIcs, icsEscape, icsUtc } from "@/lib/ics";

const NOW = new Date("2026-11-13T10:00:00Z");

describe("icsUtc and icsEscape", () => {
  it("writes a UTC stamp and escapes what a calendar treats as syntax", () => {
    expect(icsUtc(new Date("2026-11-14T09:30:05Z"))).toBe("20261114T093005Z");
    expect(icsEscape("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne");
  });
});

describe("buildAppointmentIcs", () => {
  const ics = buildAppointmentIcs({ start: new Date("2026-11-20T04:00:00Z"), title: "Dr Rao, clinic", description: "Bring the summary", now: NOW, uid: "fixed@recoverly.co.in" });

  it("is a well-formed single event with CRLF line endings and an alarm", () => {
    const lines = ics.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
    expect(lines).toContain("DTSTART:20261120T040000Z");
    expect(lines).toContain("DTEND:20261120T043000Z");
    expect(lines).toContain("SUMMARY:Dr Rao\\, clinic");
    expect(lines).toContain("TRIGGER:-PT60M");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("folds long text to 75 characters a line without losing any", () => {
    const long = "x".repeat(200);
    const out = buildAppointmentIcs({ start: new Date("2026-11-20T04:00:00Z"), title: long, now: NOW, uid: "u" });
    for (const line of out.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
    expect(out.replace(/\r\n /g, "")).toContain(`SUMMARY:${long}`);
  });

  it("does not let a title add its own calendar lines", () => {
    const out = buildAppointmentIcs({ start: new Date("2026-11-20T04:00:00Z"), title: "x\nEND:VEVENT\nBEGIN:VEVENT", now: NOW, uid: "u" });
    expect(out.split("\r\n").filter((l) => l === "END:VEVENT")).toHaveLength(1);
  });
});
