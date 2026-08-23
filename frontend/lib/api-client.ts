import { clearRegisteredQueryCache } from "@/lib/query-cache-control";
import { ApiError, parseApiResponse } from "@/lib/api-envelope";

if (!process.env.NEXT_PUBLIC_API_URL)
  throw new Error("NEXT_PUBLIC_API_URL is not set");

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 30_000;

function makeRequestSignal(external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  if (!external) return timeout;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([timeout, external]);
  return timeout;
}

const PUBLIC_AUTH_PATHS = new Set([
  "/auth/magic-link",
  "/auth/magic-link/verify",
  "/auth/verify-email",
  "/auth/email-otp",
  "/auth/email-otp/verify",
  "/organization/invitations/validate",
  "/organization/invitations/accept",
  "/organization/invitations/decline",
]);

function isPublicPath(path: string): boolean {
  const clean = path.split("?")[0];
  return PUBLIC_AUTH_PATHS.has(clean);
}

const ORGANIZATION_ACCESS_ERROR_CODES = new Set([
  "ORG_MEMBERSHIP_INACTIVE",
  "ORG_MEMBERSHIP_SUSPENDED",
]);

async function redirectForOrganizationAccessError(res: Response): Promise<void> {
  if (
    res.status !== 403 ||
    typeof window === "undefined" ||
    autoSignOutSuppressed
  )
    return;

  try {
    const body = (await res.clone().json()) as { code?: unknown };
    if (
      typeof body.code !== "string" ||
      !ORGANIZATION_ACCESS_ERROR_CODES.has(body.code)
    )
      return;

    clearBackendTokenCache();
    if (window.location.pathname !== "/access-suspended") {
      window.location.replace("/access-suspended");
    }
  } catch {
    return;
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;
let fetchingTokenPromise: Promise<string | null> | null = null;
let autoSignOutSuppressed = false;

const TOKEN_REFRESH_SKEW_MS = 30_000;

function readTokenExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function clearBackendTokenCache(): void {
  cachedToken = null;
  fetchingTokenPromise = null;
}

export function setAutoSignOutSuppressed(value: boolean): void {
  autoSignOutSuppressed = value;
}

async function getBackendToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_SKEW_MS > Date.now())
    return cachedToken.value;
  if (fetchingTokenPromise) return fetchingTokenPromise;
  fetchingTokenPromise = (async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) return null;
      const data = (await res.json()) as { backendJwt?: string };
      if (!data.backendJwt) return null;
      const expiresAt = readTokenExpiry(data.backendJwt);
      cachedToken = expiresAt === null ? null : { value: data.backendJwt, expiresAt };
      return data.backendJwt;
    } catch {
      return null;
    } finally {
      fetchingTokenPromise = null;
    }
  })();
  return fetchingTokenPromise;
}

function requestHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function newIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function authedFetch(
  url: string,
  init: RequestInit,
  path: string,
  signal?: AbortSignal,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const isPublic = isPublicPath(path);
  const combinedSignal = makeRequestSignal(signal);

  if (!isPublic && MUTATING_METHODS.has((init.method ?? "GET").toUpperCase())) {
    if (!headers.has("Idempotency-Key"))
      headers.set("Idempotency-Key", newIdempotencyKey());
  }

  if (!isPublic) {
    const token = await getBackendToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    let res = await fetch(url, { ...init, headers, credentials: "omit", signal: combinedSignal });

    if (!isPublic && res.status === 401) {
      cachedToken = null;
      const token = await getBackendToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
        res = await fetch(url, { ...init, headers, credentials: "omit", signal: combinedSignal });
      }
      if (
        res.status === 401 &&
        typeof window !== "undefined" &&
        !autoSignOutSuppressed
      ) {
        clearRegisteredQueryCache();
        void import("next-auth/react").then(({ signOut }) => {
          void signOut({ callbackUrl: "/signin" });
        });
      }
    }
    if (!isPublic) await redirectForOrganizationAccessError(res);
    return res;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError("Request timed out. Please try again.", undefined, "TIMEOUT");
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request was cancelled.", undefined, "ABORTED");
    }
    const host = requestHost(url);
    const method = (init.method ?? "GET").toUpperCase();
    const cause = error instanceof Error ? error.message : String(error);
    const target = host ? `contacting ${host} ` : "";
    throw new ApiError(
      `Network error ${target}(${method} ${path}). Check your connection and try again.`,
      undefined,
      "NETWORK_ERROR",
      { method, path, host, cause },
    );
  }
}

export function buildUrl(
  path: string,
  params?: Record<string, unknown>,
): string {
  const url = `${BACKEND_API_URL}${path}`;
  if (!params || Object.keys(params).length === 0) return url;
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return search ? `${url}?${search}` : url;
}

export {
  ApiError,
  isApiError,
  getApiErrorCode,
  parseApiResponse,
} from "@/lib/api-envelope";

async function get<T>(
  url: string,
  params?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await authedFetch(
    buildUrl(url, params),
    { method: "GET", headers: { "Content-Type": "application/json" } },
    url,
    signal,
  );
  return parseApiResponse<T>(res);
}

async function post<T>(
  url: string,
  data?: unknown,
  config?: { headers?: Record<string, string>; signal?: AbortSignal },
): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config?.headers ?? {}),
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    url,
    config?.signal,
  );
  return parseApiResponse<T>(res);
}

async function put<T>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    url,
    signal,
  );
  return parseApiResponse<T>(res);
}

async function patch<T>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    url,
    signal,
  );
  return parseApiResponse<T>(res);
}

async function del<T>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    url,
    signal,
  );
  return parseApiResponse<T>(res);
}

async function upload<T>(url: string, formData: FormData): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    { method: "POST", body: formData },
    url,
  );
  return parseApiResponse<T>(res);
}

async function download(
  url: string,
  params?: Record<string, unknown>,
): Promise<Blob> {
  const res = await authedFetch(buildUrl(url, params), { method: "GET" }, url);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {}
    throw new Error(message);
  }
  return res.blob();
}

export const apiClient = {
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
  download,
} as const;

export type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
