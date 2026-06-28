const SAME_ORIGIN = "/api";
const EXTERNAL_API = process.env.NEXT_PUBLIC_API_URL;

const MIGRATED_PREFIXES = [
  "/contacts",
  "/targets",
  "/csat",
  "/inventory",
  "/accounting",
  "/ai",
  "/audit-log",
  "/careers",
  "/billing/razorpay",
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
  "/hr/alumni",
  "/hr/analytics",
  "/hr/assessments",
  "/hr/asset-returns",
  "/hr/attendance",
  "/hr/background-verification",
  "/hr/bonuses",
  "/hr/career-ladders",
  "/hr/celebrations",
  "/hr/certifications",
  "/hr/compliance",
  "/hr/dashboard",
  "/hr/departments",
  "/hr/devices",
  "/hr/directory",
  "/hr/document-expiry",
  "/hr/document-types",
  "/hr/assets",
  "/hr/documents",
  "/hr/reimbursements",
  "/hr/email-templates",
  "/hr/employees",
  "/hr/enps",
  "/hr/exit",
  "/hr/expenses",
  "/hr/feedback",
  "/hr/fnf",
  "/hr/handbook",
  "/hr/helpdesk",
  "/hr/headcount",
  "/hr/holidays",
  "/hr/incentives",
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
  "/hr/payrolls",
  "/hr/payslips",
  "/hr/performance",
  "/hr/recognition",
  "/hr/recruitment/analytics",
  "/hr/recruitment/automations",
  "/hr/recruitment/bgv-compliance",
  "/hr/recruitment/booking-links",
  "/hr/recruitment/candidates/bulk-import",
  "/hr/recruitment/candidates/import",
  "/hr/recruitment/diversity-report",
  "/hr/recruitment/email-sequences",
  "/hr/recruitment/headcount",
  "/hr/recruitment/hiring-flows",
  "/hr/recruitment/internal-jobs",
  "/hr/recruitment/interviewer-performance",
  "/hr/recruitment/interviewers",
  "/hr/recruitment/interviews/sla-report",
  "/hr/recruitment/interviews/slas",
  "/hr/recruitment/jobs",
  "/hr/recruitment/messages/threads",
  "/hr/recruitment/offer-letter",
  "/hr/recruitment/offer-templates",
  "/hr/recruitment/pipeline",
  "/hr/recruitment/portals",
  "/hr/recruitment/recruiters",
  "/hr/recruitment/referrals",
  "/hr/recruitment/reports",
  "/hr/recruitment/scorecard-analytics",
  "/hr/recruitment/scorecard-templates",
  "/hr/recruitment/stats",
  "/hr/recruitment/vendors",
  "/hr/rich-documents",
  "/hr/salary-structures",
  "/hr/sessions",
  "/hr/skills",
  "/hr/surveys",
  "/hr/tax-calculator",
  "/hr/team-events",
  "/hr/teams",
  "/hr/wfh",
  "/hr/work-logs",
  "/invoices",
  "/kb",
  "/leads",
  "/me",
  "/notifications",
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
  "/feature-flags",
  "/org-hierarchy",
  "/support",
  "/public",
] as const;

function isMigrated(path: string): boolean {
  if (!EXTERNAL_API) return false;
  return MIGRATED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`),
  );
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getBackendToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 30_000 > now) return cachedToken.value;
  const res = await fetch(`${SAME_ORIGIN}/auth/backend-token`, { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { token: string; expiresIn: number };
  cachedToken = { value: data.token, expiresAt: now + data.expiresIn * 1000 };
  return data.token;
}

async function authedFetch(url: string, init: RequestInit, useBackend: boolean): Promise<Response> {
  const headers = new Headers(init.headers);
  if (useBackend) {
    const token = await getBackendToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  let res = await fetch(url, { ...init, headers, credentials: "include" });
  if (useBackend && res.status === 401) {
    cachedToken = null;
    const token = await getBackendToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      res = await fetch(url, { ...init, headers, credentials: "include" });
    }
  }
  return res;
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const base = isMigrated(path) && EXTERNAL_API ? EXTERNAL_API : SAME_ORIGIN;
  const url = `${base}${path}`;
  if (!params || Object.keys(params).length === 0) return url;
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return search ? `${url}?${search}` : url;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await authedFetch(
    buildUrl(url, params),
    { method: "GET", headers: { "Content-Type": "application/json" } },
    isMigrated(url),
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
  );
  return parseResponse<T>(res);
}

async function upload<T>(url: string, formData: FormData): Promise<T> {
  const res = await authedFetch(buildUrl(url), { method: "POST", body: formData }, isMigrated(url));
  return parseResponse<T>(res);
}

async function download(url: string, params?: Record<string, unknown>): Promise<Blob> {
  const res = await authedFetch(buildUrl(url, params), { method: "GET" }, isMigrated(url));
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
