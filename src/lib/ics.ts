/**
 * A single calendar event as an .ics file, built on the device from what the person typed.
 * Nothing is sent anywhere: the browser saves the file and the person opens it in their own
 * calendar. Text is escaped and long lines are folded as RFC 5545 asks, and lines end in CRLF.
 */
const pad = (n: number) => String(n).padStart(2, "0");

/** `20261114T093000Z` */
export function icsUtc(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

export function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold to 75 characters a line, continuing with a leading space. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function buildAppointmentIcs(options: { start: Date; title: string; description?: string; minutes?: number; now?: Date; uid?: string; alarmMinutes?: number }): string {
  const { start, title, description, minutes = 30, now = new Date(), alarmMinutes = 60 } = options;
  const end = new Date(start.getTime() + minutes * 60_000);
  const uid = options.uid ?? `${icsUtc(now)}-${Math.abs(start.getTime()) % 1_000_000}@recoverly.co.in`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Recoverly//Appointment//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsUtc(now)}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    ...(description ? [`DESCRIPTION:${icsEscape(description)}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(title)}`,
    `TRIGGER:-PT${alarmMinutes}M`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
