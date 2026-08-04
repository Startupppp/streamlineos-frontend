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
]);

function isPublicPath(path: string): boolean {
  const clean = path.split("?")[0];
  return PUBLIC_AUTH_PATHS.has(clean);
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

export async function authedFetch(
  url: string,
  init: RequestInit,
  path: string,
  signal?: AbortSignal,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const isPublic = isPublicPath(path);
  const combinedSignal = makeRequestSignal(signal);

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
        void import("next-auth/react").then(({ signOut }) => {
          void signOut({ callbackUrl: "/signin" });
        });
      }
    }
    return res;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError("Request timed out. Please try again.", undefined, "TIMEOUT");
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request was cancelled.", undefined, "ABORTED");
    }
    const host = requestHost(url);
    if (host) {
      throw new ApiError(
        `Network error contacting ${host}. Check your connection and try again.`,
        undefined,
        "NETWORK_ERROR",
      );
    }
    if (error instanceof Error) throw error;
    throw new ApiError(
      "Network error. Check your connection and try again.",
      undefined,
      "NETWORK_ERROR",
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

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
      if (typeof body?.message === "string" && body.message)
        message = body.message;
      else if (Array.isArray(body?.message) && body.message.length > 0) {
        message = body.message
          .filter((m): m is string => typeof m === "string")
          .join(", ");
      } else if (typeof body?.error === "string" && body.error)
        message = body.error;
      if (typeof body?.code === "string") code = body.code;
      const { message: _m, error: _e, code: _c, statusCode: _s, success: _su, ...rest } = body;
      if (Object.keys(rest).length > 0) details = rest;
    } catch {}
    throw new ApiError(message, res.status, code, details);
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as Record<string, unknown>;
  if (
    body !== null &&
    typeof body === "object" &&
    body.success === true &&
    "data" in body
  ) {
    return body.data as T;
  }
  return body as T;
}

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
  return parseResponse<T>(res);
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
  return parseResponse<T>(res);
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
  return parseResponse<T>(res);
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
  return parseResponse<T>(res);
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
  return parseResponse<T>(res);
}

async function upload<T>(url: string, formData: FormData): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    { method: "POST", body: formData },
    url,
  );
  return parseResponse<T>(res);
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
