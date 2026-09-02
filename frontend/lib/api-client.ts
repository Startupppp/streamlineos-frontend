import { clearRegisteredQueryCache } from "@/lib/query-cache-control";
import {
  ApiError,
  parseApiResponse,
  type ResponseContract,
} from "@/lib/api-envelope";
import { newCorrelationId, noteCorrelationId } from "./observability";
import { IDEMPOTENCY_HEADER, newIdempotencyKey } from "@/lib/idempotency-key";

if (!process.env.NEXT_PUBLIC_API_URL)
  throw new Error("NEXT_PUBLIC_API_URL is not set");

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * `AbortSignal.any` is Chrome 116 / Safari 17.4 / Firefox 124. Falling back to
 * the timeout alone dropped the caller's signal, which made every cancel in the
 * app a silent no-op on an older browser — the request ran to completion after
 * the user pressed Stop, and on an AI surface it kept spending credits. Linking
 * by hand keeps both sources, and forwarding `reason` preserves the
 * `TimeoutError` that the catch below branches on.
 */
function linkAbortSignals(sources: readonly AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const source of sources) {
    if (source.aborted) {
      controller.abort(source.reason);
      return controller.signal;
    }
    source.addEventListener("abort", () => controller.abort(source.reason), {
      once: true,
    });
  }
  return controller.signal;
}

function makeRequestSignal(external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  if (!external) return timeout;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([timeout, external]);
  return linkAbortSignals([timeout, external]);
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
  // `init.signal` is destructured out rather than left to be shadowed by the
  // `signal:` written after the spread below — a caller that passed one had it
  // silently overwritten, which is what made `useAskAI`'s stop() a no-op.
  const { signal: initSignal, ...requestInit } = init;
  const headers = new Headers(init.headers);
  const isPublic = isPublicPath(path);
  const combinedSignal = makeRequestSignal(signal ?? initSignal ?? undefined);

  // One id per request, sent to the API and remembered here, so a browser error
  // report and the server-side logs for the same call can be joined up.
  if (!headers.has("x-correlation-id")) {
    const correlationId = newCorrelationId();
    headers.set("x-correlation-id", correlationId);
    noteCorrelationId(correlationId);
  }

  if (!isPublic && MUTATING_METHODS.has((init.method ?? "GET").toUpperCase())) {
    // Last resort only: an @Idempotent route 400s without the header, and the
    // error reads like a body validation failure. A caller that can be retried
    // supplies its own key — see hooks/common/use-idempotent-operation.ts.
    if (!headers.has(IDEMPOTENCY_HEADER))
      headers.set(IDEMPOTENCY_HEADER, newIdempotencyKey());
  }

  if (!isPublic) {
    const token = await getBackendToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    let res = await fetch(url, { ...requestInit, headers, credentials: "omit", signal: combinedSignal });

    if (!isPublic && res.status === 401) {
      cachedToken = null;
      const token = await getBackendToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
        res = await fetch(url, { ...requestInit, headers, credentials: "omit", signal: combinedSignal });
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

type NoAbortSignal = {
  readonly aborted?: never;
  readonly addEventListener?: never;
  readonly throwIfAborted?: never;
};

// The union keeps fresh object literals, interfaces and Record shapes assignable
// while making `apiClient.get(url, signal)` — signal in the params slot — a compile error.
export type QueryParams =
  | ({ readonly [key: string]: unknown } & NoAbortSignal)
  | (object & NoAbortSignal);

export function buildUrl(path: string, params?: QueryParams): string {
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
} from "@/lib/api-envelope";

/**
 * Pass `contract` and the response body is validated at runtime, so a backend
 * rename fails the read instead of arriving as an undefined field. Omit it and
 * the body is cast unchecked — see `assertUnchecked` in `lib/api-envelope.ts`.
 */
async function get<T>(
  url: string,
  params?: QueryParams,
  signal?: AbortSignal,
  contract?: ResponseContract<T>,
): Promise<T> {
  const res = await authedFetch(
    buildUrl(url, params),
    { method: "GET", headers: { "Content-Type": "application/json" } },
    url,
    signal,
  );
  return parseApiResponse<T>(res, contract, url);
}

export interface RequestConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function post<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
  contract?: ResponseContract<T>,
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
  return parseApiResponse<T>(res, contract, url);
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
  contract?: ResponseContract<T>,
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
  return parseApiResponse<T>(res, contract, url);
}

async function put<T>(
  url: string,
  data?: unknown,
  config?: AbortSignal | RequestConfig,
  contract?: ResponseContract<T>,
): Promise<T> {
  return mutate<T>("PUT", url, data, config, contract);
}

async function patch<T>(
  url: string,
  data?: unknown,
  config?: AbortSignal | RequestConfig,
  contract?: ResponseContract<T>,
): Promise<T> {
  return mutate<T>("PATCH", url, data, config, contract);
}

async function del<T>(
  url: string,
  data?: unknown,
  config?: AbortSignal | RequestConfig,
  contract?: ResponseContract<T>,
): Promise<T> {
  return mutate<T>("DELETE", url, data, config, contract);
}

async function upload<T>(
  url: string,
  formData: FormData,
  contract?: ResponseContract<T>,
): Promise<T> {
  const res = await authedFetch(
    buildUrl(url),
    { method: "POST", body: formData },
    url,
  );
  return parseApiResponse<T>(res, contract, url);
}

async function download(
  url: string,
  params?: QueryParams,
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

