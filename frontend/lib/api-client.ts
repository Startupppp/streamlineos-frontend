import { clearRegisteredQueryCache } from "@/lib/query-cache-control";
import { ApiError, apiErrorFromResponse, parseApiResponse } from "@/lib/api-envelope";
import { newCorrelationId, noteCorrelationId } from "./observability";
import { randomId } from "./random-id";

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

export async function authedFetch(
  url: string,
  init: RequestInit,
  path: string,
  signal?: AbortSignal,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const isPublic = isPublicPath(path);
  const combinedSignal = makeRequestSignal(signal);

  // One id per request, sent to the API and remembered here, so a browser error
  // report and the server-side logs for the same call can be joined up.
  if (!headers.has("x-correlation-id")) {
    const correlationId = newCorrelationId();
    headers.set("x-correlation-id", correlationId);
    noteCorrelationId(correlationId);
  }

  if (!isPublic && MUTATING_METHODS.has((init.method ?? "GET").toUpperCase())) {
    if (!headers.has("Idempotency-Key"))
      headers.set("Idempotency-Key", randomId());
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

export function buildUrl(path: string, params?: object): string {
  const url = `${BACKEND_API_URL}${path}`;
  if (!params || Object.keys(params).length === 0) return url;
  const entries: Array<[string, unknown]> = Object.entries(params);
  const search = new URLSearchParams(
    entries
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
  params?: object,
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

export interface RequestConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function post<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
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

function toRequestConfig(config?: AbortSignal | RequestConfig): RequestConfig {
  if (!config) return {};
  return "aborted" in config ? { signal: config } : config;
}

async function mutate<T>(
  method: "PUT" | "PATCH" | "DELETE",
  url: string,
  data?: unknown,
  config?: AbortSignal | RequestConfig,
): Promise<T> {
  const resolved = toRequestConfig(config);
  const res = await authedFetch(
    buildUrl(url),
    {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(resolved.headers ?? {}),
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    url,
    resolved.signal,
  );
  return parseApiResponse<T>(res);
}

async function put<T>(
  url: string,
  data?: unknown,
  config?: AbortSignal | RequestConfig,
): Promise<T> {
  return mutate<T>("PUT", url, data, config);
}

async function patch<T>(
  url: string,
  data?: unknown,
  config?: AbortSignal | RequestConfig,
): Promise<T> {
  return mutate<T>("PATCH", url, data, config);
}

async function del<T>(
  url: string,
  data?: unknown,
  config?: AbortSignal | RequestConfig,
): Promise<T> {
  return mutate<T>("DELETE", url, data, config);
}

async function upload<T>(url: string, formData: FormData): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    { method: "POST", body: formData },
    url,
  );
  return parseApiResponse<T>(res);
}

export interface DownloadConfig {
  /**
   * A file can be the answer to a request too complex for a query string. The
   * inventory report builder hands back the exact spec its preview ran, and a
   * discriminated union of filters is a body, not a `?filters=` — so the one
   * client learns POST rather than a hook growing its own `fetch` beside it.
   */
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
}

async function download(
  url: string,
  params?: object,
  config?: DownloadConfig,
): Promise<Blob> {
  const method = config?.method ?? "GET";
  const res = await authedFetch(
    buildUrl(url, params),
    {
      method,
      ...(config?.body !== undefined
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config.body),
          }
        : {}),
    },
    url,
    config?.signal,
  );
  // The same ApiError every other call site gets. This used to be a bare
  // `Error` carrying only `body.error`, so a failed download reached
  // `getErrorMessage` with no status, no code and no `details` — and NestJS
  // puts the sentence in `message`, which was never read at all.
  if (!res.ok) throw await apiErrorFromResponse(res);
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
