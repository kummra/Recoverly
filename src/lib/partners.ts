/**
 * Enquiries from organisations (clinics, workplaces, colleges and so on) who
 * want to explore a pilot. Shared by the form (to say what is wrong before it
 * is sent) and by the route (which decides, because a browser can be bypassed).
 *
 * Free of server-only imports so it can be unit tested and used in both places.
 */
import { z } from "zod";

export const ORG_TYPES = ["clinic", "workplace", "fleet", "college", "insurer", "ngo-government", "other"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  clinic: "Clinic, hospital or de-addiction centre",
  workplace: "Employer or workplace",
  fleet: "Transport or fleet operator",
  college: "College or university",
  insurer: "Insurer or TPA",
  "ngo-government": "NGO, government or CSR programme",
  other: "Something else"
};

/** How long an enquiry is kept. The privacy policy says "no longer than 12
 *  months"; each stored enquiry carries `deleteAt` so a Firestore TTL policy on
 *  that field can enforce it without anyone having to remember. */
export const ENQUIRY_RETENTION_DAYS = 365;

export const MAX_MESSAGE_LENGTH = 1000;

/** Empty optional inputs arrive from a form as "", which means "not given". */
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());

export const partnerEnquirySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(120)),
  organisation: z.string().trim().min(2).max(120),
  orgType: z.enum(ORG_TYPES),
  role: optionalText(80),
  message: optionalText(MAX_MESSAGE_LENGTH),
  /** Must be given: the form says what the details are used for. */
  consent: z.literal(true)
});

export type PartnerEnquiry = z.infer<typeof partnerEnquirySchema>;

export type ParsedEnquiry = { ok: true; data: PartnerEnquiry } | { ok: false; fields: string[] };

/** Validate whatever arrived. On failure, name the fields so the form can mark them. */
export function parseEnquiry(input: unknown): ParsedEnquiry {
  const result = partnerEnquirySchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const fields = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
  return { ok: false, fields };
}

/**
 * A field real people never see or fill in. Bots that fill every input in the
 * markup reveal themselves by completing it, and are then answered as if they
 * had succeeded, so they learn nothing from the response.
 */
export function isHoneypotTripped(input: unknown): boolean {
  const value = (input as { website?: unknown } | null | undefined)?.website;
  return typeof value === "string" && value.trim() !== "";
}

/** What is stored: only what was typed, a timestamp and the delete-by date. No
 *  address, no browser details, nothing about who the visitor is beyond that. */
export function enquiryToDocument(data: PartnerEnquiry, now: Date) {
  return {
    name: data.name,
    email: data.email,
    organisation: data.organisation,
    orgType: data.orgType,
    role: data.role ?? null,
    message: data.message ?? null,
    source: "partners-page",
    createdAt: now,
    deleteAt: new Date(now.getTime() + ENQUIRY_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  };
}
