/**
 * The browser's side of the organisation portal: small typed calls to our own routes with the person's sign-in.
 * Every call answers `{ ok: true, data }` or `{ ok: false, message }` with a sentence that is fit to show, so the
 * screens never have to interpret a status code.
 */
import type { ProgrammeFeatures, PortalOverview, PortalProgramme } from "@/lib/org/model";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string; details: string[] };
type Fetch = typeof fetch;

const FALLBACK: Record<number, string> = {
  401: "Please sign in again.",
  402: "An active plan is needed for this.",
  403: "That is not allowed.",
  404: "That was not found.",
  413: "That is too large.",
  429: "Too many requests. Please wait a moment and try again.",
  503: "This is not available right now. Please try again later."
};

async function call<T>(token: string | null, method: string, path: string, body?: unknown, fetchImpl: Fetch = fetch): Promise<ApiResult<T>> {
  if (!token) return { ok: false, status: 401, message: FALLBACK[401], details: [] };
  try {
    const response = await fetchImpl(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const details = Array.isArray(data.details) ? data.details.filter((d): d is string => typeof d === "string") : [];
      const message = typeof data.message === "string" && data.message ? data.message : (FALLBACK[response.status] ?? "Something went wrong. Please try again.");
      return { ok: false, status: response.status, message, details };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0, message: "We could not reach the server. Check your connection and try again.", details: [] };
  }
}

export const getOverview = (token: string | null, f?: Fetch) => call<{ overview: PortalOverview | null }>(token, "GET", "/api/org", undefined, f);
export const createOrg = (token: string | null, body: { name: string; kind: string; acceptTerms: boolean }, f?: Fetch) => call<{ overview: PortalOverview }>(token, "POST", "/api/org", body, f);
export const renameOrg = (token: string | null, name: string, f?: Fetch) => call<{ ok: true }>(token, "PATCH", "/api/org", { name }, f);
export const createProgramme = (token: string | null, content: unknown, f?: Fetch) => call<{ programme: PortalProgramme }>(token, "POST", "/api/org/programmes", { content }, f);
export const updateProgramme = (token: string | null, code: string, content: unknown, f?: Fetch) => call<{ programme: PortalProgramme }>(token, "PUT", `/api/org/programmes/${encodeURIComponent(code)}`, { content }, f);
export const setFeatures = (token: string | null, code: string, features: Partial<ProgrammeFeatures>, f?: Fetch) => call<{ programme: PortalProgramme; reportKey?: string }>(token, "PATCH", `/api/org/programmes/${encodeURIComponent(code)}`, { features }, f);
export const rotateReportKey = (token: string | null, code: string, f?: Fetch) => call<{ reportKey: string }>(token, "PATCH", `/api/org/programmes/${encodeURIComponent(code)}`, { rotateReportKey: true }, f);
export const setWorkspaceKey = (token: string | null, code: string, workspaceKey: unknown, f?: Fetch) => call<{ keyId: string }>(token, "PATCH", `/api/org/programmes/${encodeURIComponent(code)}`, { workspaceKey }, f);
export const deleteProgramme = (token: string | null, code: string, f?: Fetch) => call<{ ok: true }>(token, "DELETE", `/api/org/programmes/${encodeURIComponent(code)}`, undefined, f);
export const setLogo = (token: string | null, code: string, logo: { type: string; data: string }, f?: Fetch) => call<{ programme: PortalProgramme }>(token, "PUT", `/api/org/programmes/${encodeURIComponent(code)}/logo`, logo, f);
export const removeLogo = (token: string | null, code: string, f?: Fetch) => call<{ programme: PortalProgramme }>(token, "DELETE", `/api/org/programmes/${encodeURIComponent(code)}/logo`, undefined, f);

/** A logo as an address a picture tag can show (a temporary blob address), fetched with the person's sign-in; `null` if there is none. */
export async function fetchLogoPreview(token: string | null, path: string, f: Fetch = fetch): Promise<string | null> {
  if (!token) return null;
  try {
    const response = await f(path, { headers: { Authorization: `Bearer ${token}` } });
    return response.ok ? URL.createObjectURL(await response.blob()) : null;
  } catch {
    return null;
  }
}
export const makeRollupKey = (token: string | null, f?: Fetch) => call<{ rollupKey: string }>(token, "POST", "/api/org/rollup", undefined, f);
export const startCheckout = (token: string | null, item: { plan: string } | { product: string }, f?: Fetch) => call<{ url: string }>(token, "POST", "/api/billing/checkout", item, f);
export const openBillingPortal = (token: string | null, f?: Fetch) => call<{ url: string }>(token, "POST", "/api/billing/portal", undefined, f);
export const confirmCheckout = (token: string | null, sessionId: string, f?: Fetch) => call<{ access: { active: boolean } }>(token, "POST", "/api/billing/confirm", { sessionId }, f);

/** The address a private link is shown at, built from the secret that was just made. */
export function privateLink(origin: string, kind: "report" | "workspace" | "group", secret: string): string {
  return `${origin}/partners/${kind}/${secret}`;
}

export type Prices = Record<string, { text: string } | null>;
export async function getPrices(f: Fetch = fetch): Promise<Prices> {
  try {
    const response = await f("/api/billing/prices");
    if (!response.ok) return {};
    const data = (await response.json()) as { prices?: Prices };
    return data.prices ?? {};
  } catch {
    return {};
  }
}
