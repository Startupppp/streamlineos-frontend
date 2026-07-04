const SAME_ORIGIN = "/api";
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500";

const MIGRATED_PREFIXES = [
  "/contacts",
  "/targets",
  "/csat",
  "/surveys",
  "/inventory",
  "/accounting",
  "/ai",
  "/audit-log",
  "/careers",
  "/billing",
  "/blog",
  "/branches",
  "/calendar",
  "/chat",
  "/chat/channels",
  "/chat/presence",
  "/chat/search",
  "/chat/status",
  "/chat/unread",
  "/chat/users",
  "/clients",
  "/crm",
  "/customer-executive",
  "/dashboard",
  "/deals",
  "/goals",
  "/hr/analytics",
  "/hr/asset-returns",
  "/hr/attendance",
  "/hr/background-verification",
  "/hr/celebrations",
  "/hr/certifications",
  "/hr/dashboard",
  "/hr/departments",
  "/hr/directory",
  "/hr/document-expiry",
  "/hr/document-types",
  "/hr/assets",
  "/hr/documents",
  "/hr/reimbursements",
  "/hr/email-templates",
  "/hr/employees",
  "/hr/exit",
  "/hr/expenses",
  "/hr/feedback",
  "/hr/fnf",
  "/hr/handbook",
  "/hr/headcount",
  "/hr/holidays",
  "/hr/integrations/accounting-export",
  "/hr/integrations/google-calendar",
  "/hr/integrations/send-email",
  "/hr/interview-questions",
  "/hr/learning-paths",
  "/hr/leave-calendar",
  "/hr/leaves",
  "/hr/loans",
  "/hr/my-goals",
  "/hr/notification-preferences",
  "/hr/onboarding-docs",
  "/hr/org-chart",
  "/hr/payroll-reports",
  "/hr/payroll",
  "/hr/payrolls",
  "/hr/payslips",
  "/hr/performance",
  "/hr/recruitment/analytics",
  "/hr/recruitment/automations",
  "/hr/recruitment/bgv-compliance",
  "/hr/recruitment/booking-links",
  "/hr/recruitment/candidates",
  "/hr/recruitment/diversity-report",
  "/hr/recruitment/email-sequences",
  "/hr/recruitment/external-referrals",
  "/hr/recruitment/external-referrers",
  "/hr/recruitment/headcount",
  "/hr/recruitment/hiring-flows",
  "/hr/recruitment/internal-jobs",
  "/hr/recruitment/interviewer-performance",
  "/hr/recruitment/interviewers",
  "/hr/recruitment/interviews",
  "/hr/recruitment/jobs",
  "/hr/recruitment/messages",
  "/hr/recruitment/offer-letter",
  "/hr/recruitment/offer-templates",
  "/hr/recruitment/offers",
  "/hr/recruitment/pipeline",
  "/hr/recruitment/portals",
  "/hr/recruitment/recruiters",
  "/hr/recruitment/referrals",
  "/hr/recruitment/reports",
  "/hr/recruitment/requisitions",
  "/hr/recruitment/scorecard-analytics",
  "/hr/recruitment/scorecard-templates",
  "/hr/recruitment/stats",
  "/hr/recruitment/talent-pools",
  "/hr/recruitment/vendors",
  "/hr/rich-documents",
  "/hr/salary-structures",
  "/hr/sessions",
  "/hr/skills",
  "/hr/tax-calculator",
  "/hr/teams",
  "/hr/wfh",
  "/hr/work-logs",
  "/hr/shifts",
  "/hr/rosters",
  "/hr/overtime",
  "/hr/geofencing",
  "/hr/biometric",
  "/hr/courses",
  "/hr/training",
  "/invoices",
  "/kb",
  "/leads",
  "/me",
  "/notifications",
  "/notification-templates",
  "/notification-preferences",
  "/notification-analytics",
  "/notification-queue",
  "/broadcasts",
  "/onboarding",
  "/org",
  "/organization",
  "/projects",
  "/push",
  "/quotes",
  "/rbac",
  "/reports",
  "/roles",
  "/sales",
  "/search",
  "/settings",
  "/storage",
  "/tasks",
  "/webhooks",
  "/whiteboards",
  "/workflows",
  "/workspace-onboarding",
  "/feature-flags",
  "/org-hierarchy",
  "/api-tokens",
  "/support",
  "/public",
  "/access",
  "/auth",
  "/users",
  "/payroll",
  "/timesheets",
] as const;

const PUBLIC_AUTH_PATHS = new Set([
  "/auth/register",
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/magic-link",
  "/auth/magic-link/verify",
  "/auth/verify-email",
]);

function isMigrated(path: string): boolean {
  return MIGRATED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`),
  );
}

function isPublicPath(path: string): boolean {
  const clean = path.split("?")[0];
  return PUBLIC_AUTH_PATHS.has(clean);
}

let cachedToken: { value: string; expiresAt: number } | null = null;
let fetchingTokenPromise: Promise<string | null> | null = null;

export function clearBackendTokenCache(): void {
  cachedToken = null;
  fetchingTokenPromise = null;
}

async function getBackendToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 30_000 > now) return cachedToken.value;
  if (fetchingTokenPromise) return fetchingTokenPromise;
  fetchingTokenPromise = (async () => {
    try {
      const res = await fetch(`${SAME_ORIGIN}/auth/session`, { credentials: "include" });
      if (!res.ok) return null;
      const data = (await res.json()) as { backendJwt?: string };
      if (!data.backendJwt) return null;
      cachedToken = { value: data.backendJwt, expiresAt: now + 540_000 };
      return data.backendJwt;
    } catch {
      return null;
    } finally {
      fetchingTokenPromise = null;
    }
  })();
  return fetchingTokenPromise;
}

export async function authedFetch(url: string, init: RequestInit, useBackend: boolean, path: string): Promise<Response> {
  const headers = new Headers(init.headers);
  const isPublic = isPublicPath(path);

  if (useBackend && !isPublic) {
    const token = await getBackendToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const credentials: RequestCredentials = useBackend ? "omit" : "include";
  let res = await fetch(url, { ...init, headers, credentials });

  if (useBackend && !isPublic && res.status === 401) {
    cachedToken = null;
    const token = await getBackendToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      res = await fetch(url, { ...init, headers, credentials });
    }
    if (res.status === 401 && typeof window !== "undefined") {
      void import("next-auth/react").then(({ signOut }) => {
        void signOut({ callbackUrl: "/signin" });
      });
    }
  }
  return res;
}

export function buildUrl(path: string, params?: Record<string, unknown>): string {
  const base = isMigrated(path) ? BACKEND_API_URL : SAME_ORIGIN;
  const url = `${base}${path}`;
  if (!params || Object.keys(params).length === 0) return url;
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return search ? `${url}?${search}` : url;
}

export class ApiError extends Error {
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiErrorCode(error: unknown): string | undefined {
  return isApiError(error) ? error.code : undefined;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    let code: string | undefined;
    let details: unknown;
    try {
      const body = (await res.json()) as Record<string, unknown>;
      if (typeof body?.message === "string" && body.message) message = body.message;
      else if (typeof body?.error === "string" && body.error) message = body.error;
      if (typeof body?.code === "string") code = body.code;
      if ("details" in body) details = body.details;
    } catch {
    }
    throw new ApiError(message, code, details);
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as Record<string, unknown>;
  if (body !== null && typeof body === "object" && body.success === true && "data" in body) {
    return body.data as T;
  }
  return body as T;
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await authedFetch(
    buildUrl(url, params),
    { method: "GET", headers: { "Content-Type": "application/json" } },
    isMigrated(url),
    url,
  );
  return parseResponse<T>(res);
}

async function post<T>(url: string, data?: unknown, config?: { headers?: Record<string, string> }): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(config?.headers ?? {}) },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    isMigrated(url),
    url,
  );
  return parseResponse<T>(res);
}

async function put<T>(url: string, data?: unknown): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    isMigrated(url),
    url,
  );
  return parseResponse<T>(res);
}

async function patch<T>(url: string, data?: unknown): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    isMigrated(url),
    url,
  );
  return parseResponse<T>(res);
}

async function del<T>(url: string, data?: unknown): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    isMigrated(url),
    url,
  );
  return parseResponse<T>(res);
}

async function upload<T>(url: string, formData: FormData): Promise<T> {
  const res = await authedFetch(buildUrl(url), { method: "POST", body: formData }, isMigrated(url), url);
  return parseResponse<T>(res);
}

async function download(url: string, params?: Record<string, unknown>): Promise<Blob> {
  const res = await authedFetch(buildUrl(url, params), { method: "GET" }, isMigrated(url), url);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
    }
    throw new Error(message);
  }
  return res.blob();
}

export const apiClient = { get, post, put, patch, delete: del, upload, download } as const;

export function getApiError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export { getErrorMessage } from "./get-error-message";

export type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
