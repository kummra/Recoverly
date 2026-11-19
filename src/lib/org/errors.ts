/** The refusals the portal and billing code can give, each with the HTTP status a route answers with. */
export type OrgErrorCode = "invalid" | "not_found" | "exists" | "no_access" | "limit" | "forbidden" | "conflict" | "unavailable";

export class OrgError extends Error {
  constructor(
    readonly code: OrgErrorCode,
    message: string,
    readonly details: string[] = []
  ) {
    super(message);
  }
}

export const ORG_ERROR_STATUS: Record<OrgErrorCode, number> = { invalid: 400, not_found: 404, exists: 409, no_access: 402, limit: 409, forbidden: 403, conflict: 409, unavailable: 503 };
