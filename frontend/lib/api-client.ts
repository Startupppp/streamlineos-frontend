import { clearRegisteredQueryCache } from "@/lib/query-cache-control";
import { isRecord } from "@/lib/is-record";
import { signInPathForMissingSession } from "@/lib/auth-session-cookies";
import {
  ApiError,
  apiErrorFromResponse,
  parseApiResponse,
  resolveContract,
  type ContractSource,
  type ResponseContract,
} from "@/lib/api-envelope";
import { newCorrelationId, noteCorrelationId } from "./observability";
import { IDEMPOTENCY_HEADER, newIdempotencyKey } from "@/lib/idempotency-key";
import { assertRequestIdentity, type ExpectedRequestIdentity } from "./api-request-identity";

if (!process.env.NEXT_PUBLIC_API_URL)
  throw new Error("NEXT_PUBLIC_API_URL is not set");

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 30_000;

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

function makeRequestSignal(
  external?: AbortSignal,
  timeoutMs?: number,
): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs ?? REQUEST_TIMEOUT_MS);
  if (!external) return timeout;
  if (typeof AbortSignal.any === "function")
    return AbortSignal.any([timeout, external]);
  return linkAbortSignals([timeout, external]);
}

export interface AuthedFetchOptions {
  timeoutMs?: number;
  asRealUser?: boolean;
  expectedIdentity?: ExpectedRequestIdentity;
}

const PUBLIC_AUTH_PATHS = new Set([
  "/auth/magic-link",
  "/auth/magic-link/verify",
  "/auth/verify-email",
  "/auth/email-otp",
  "/auth/email-otp/verify",
  "/organization/invitations/validate",
  "/organization/invitations/request-otp",
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

async function redirectForOrganizationAccessError(
  res: Response,
): Promise<void> {
  if (
    res.status !== 403 ||
    typeof window === "undefined" ||
    autoSignOutSuppressed
  )
    return;

  try {
    const body: unknown = await res.clone().json();
    if (
      !isRecord(body) ||
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

let impersonationToken: string | null = null;
let impersonationTargetUser: { id: string; name: string | null; email: string } | null = null;
let impersonationSessionId: string | null = null;
let impersonationExpiresAt: number | null = null;

export function setImpersonationToken(
  token: string | null,
  targetUser: { id: string; name: string | null; email: string } | null,
  sessionId?: string | null,
  expiresAt?: string | number | null,
): void {
  impersonationToken = token;
  impersonationTargetUser = targetUser;
  impersonationSessionId = sessionId ?? null;
  impersonationExpiresAt =
    token === null || expiresAt === undefined || expiresAt === null
      ? null
      : typeof expiresAt === "number"
        ? expiresAt
        : Date.parse(expiresAt) || null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("impersonation-change", {
        detail: token !== null ? { active: true, targetUser, sessionId } : { active: false },
      }),
    );
  }
}

export function isImpersonating(): boolean {
  return impersonationToken !== null;
}

export function getImpersonationUser(): { id: string; name: string | null; email: string } | null {
  return impersonationTargetUser;
}

export function getImpersonationSessionId(): string | null {
  return impersonationSessionId;
}

const TOKEN_REFRESH_SKEW_MS = 30_000;
const TOKEN_FALLBACK_TTL_MS = 8 * 60 * 1_000;

const TOKEN_UNAVAILABLE_BACKOFF_MS = 3_000;
const SESSION_TOKEN_TIMEOUT_MS = 20_000;
let tokenUnavailableUntil = 0;

function readTokenExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims: unknown = JSON.parse(json);
    if (!isRecord(claims) || typeof claims.exp !== "number") return null;
    return claims.exp * 1000;
  } catch {
    return null;
  }
}

let tokenGeneration = 0;
let sessionEnded = false;
let refreshAfterUnauthorizedPromise: Promise<string | null> | null = null;

function resetTokenState(): void {
  cachedToken = null;
  fetchingTokenPromise = null;
  tokenUnavailableUntil = 0;
  tokenGeneration += 1;
}

export function seedBackendToken(token: string): void {
  if (sessionEnded || cachedToken !== null) return;
  const expiresAt = readTokenExpiry(token);
  if (expiresAt === null || expiresAt - TOKEN_REFRESH_SKEW_MS <= Date.now()) return;
  cachedToken = { value: token, expiresAt };
}

export function clearBackendTokenCache(): void {
  resetTokenState();
  sessionEnded = false;
}

async function refreshAfterUnauthorized(
  staleToken: string | null,
  options?: { asRealUser?: boolean },
): Promise<string | null> {
  if (cachedToken !== null && cachedToken.value !== staleToken)
    return cachedToken.value;
  if (refreshAfterUnauthorizedPromise) return refreshAfterUnauthorizedPromise;
  refreshAfterUnauthorizedPromise = (async () => {
    try {
      resetTokenState();
      return await getBackendToken(options);
    } finally {
      refreshAfterUnauthorizedPromise = null;
    }
  })();
  return refreshAfterUnauthorizedPromise;
}

export function endSession(): void {
  if (sessionEnded) return;
  sessionEnded = true;
  clearRegisteredQueryCache();
  void import("next-auth/react").then(({ signOut }) => {
    const here =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : undefined;
    void signOut({ callbackUrl: signInPathForMissingSession(here) });
  });
}

export function clearImpersonation(): void {
  if (impersonationToken === null) return;
  setImpersonationToken(null, null);
}

export function setAutoSignOutSuppressed(value: boolean): void {
  autoSignOutSuppressed = value;
}

export async function getBackendToken(
  options?: { asRealUser?: boolean },
): Promise<string | null> {
  if (impersonationToken !== null && options?.asRealUser !== true) {
    if (
      impersonationExpiresAt !== null &&
      impersonationExpiresAt - TOKEN_REFRESH_SKEW_MS <= Date.now()
    )
      setImpersonationToken(null, null);
    else return impersonationToken;
  }
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_SKEW_MS > Date.now())
    return cachedToken.value;
  if (tokenUnavailableUntil > Date.now()) return null;
  if (fetchingTokenPromise) return fetchingTokenPromise;
  const generation = tokenGeneration;
  fetchingTokenPromise = (async () => {
    let minted: string | null = null;
    let timedOut = false;
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        signal: AbortSignal.timeout(SESSION_TOKEN_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const data: unknown = await res.json();
      if (
        !isRecord(data) ||
        typeof data.backendJwt !== "string" ||
        !data.backendJwt
      )
        return null;
      minted = data.backendJwt;
      if (generation !== tokenGeneration) return null;
      const expiresAt = readTokenExpiry(minted);
      cachedToken = {
        value: minted,
        expiresAt: expiresAt ?? (Date.now() + TOKEN_FALLBACK_TTL_MS),
      };
      tokenUnavailableUntil = 0;
      return minted;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        timedOut = true;
        throw new ApiError("Request timed out. Please try again.", undefined, "TIMEOUT");
      }
      return null;
    } finally {
      if (generation === tokenGeneration) {
        if (minted === null && !timedOut)
          tokenUnavailableUntil = Date.now() + TOKEN_UNAVAILABLE_BACKOFF_MS;
        fetchingTokenPromise = null;
      }
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

export { newIdempotencyKey };

export async function authedFetch(
  url: string,
  init: RequestInit,
  path: string,
  signal?: AbortSignal,
  options?: AuthedFetchOptions,
): Promise<Response> {
  const { signal: initSignal, ...requestInit } = init;
  const headers = new Headers(init.headers);
  const isPublic = isPublicPath(path);
  const combinedSignal = makeRequestSignal(
    signal ?? initSignal ?? undefined,
    options?.timeoutMs,
  );

  if (!headers.has("x-correlation-id")) {
    const correlationId = newCorrelationId();
    headers.set("x-correlation-id", correlationId);
    noteCorrelationId(correlationId);
  }

  if (!isPublic && MUTATING_METHODS.has((init.method ?? "GET").toUpperCase())) {
    if (!headers.has(IDEMPOTENCY_HEADER))
      headers.set(IDEMPOTENCY_HEADER, newIdempotencyKey());
  }

  const tokenOptions =
    options?.asRealUser === true ? { asRealUser: true } : undefined;

  let sentToken: string | null = null;
  if (!isPublic) {
    sentToken = await getBackendToken(tokenOptions);
    if (sentToken) headers.set("Authorization", `Bearer ${sentToken}`);
  }

  assertRequestIdentity(sentToken, options?.expectedIdentity, combinedSignal, isImpersonating());
  let res = await fetchOrThrowTransportError(url, requestInit, headers, combinedSignal, path);

  let finalToken = sentToken;
  if (!isPublic && res.status === 401) {
    const token = await refreshAfterUnauthorized(sentToken, tokenOptions);
    assertRequestIdentity(token, options?.expectedIdentity, combinedSignal, isImpersonating());
    if (token) {
      finalToken = token;
      headers.set("Authorization", `Bearer ${token}`);
      res = await fetchOrThrowTransportError(url, requestInit, headers, combinedSignal, path);
    }
  }
  if (options?.expectedIdentity !== undefined)
    assertRequestIdentity(finalToken, options.expectedIdentity, combinedSignal, isImpersonating());
  if (!isPublic && options?.expectedIdentity === undefined && res.status === 401 && typeof window !== "undefined" && !autoSignOutSuppressed) endSession();
  if (!isPublic && options?.expectedIdentity === undefined) await redirectForOrganizationAccessError(res);
  return res;
}

const OUTAGE_BASE_MS = 5_000;
const OUTAGE_CEILING_MS = 60_000;
const OUTAGE_STATUSES = new Set([502, 503, 504]);
let outageUntil = 0;
let outageBackoffMs = OUTAGE_BASE_MS;

function noteOriginOutage(): void {
  if (Date.now() < outageUntil) return;
  outageUntil = Date.now() + outageBackoffMs;
  outageBackoffMs = Math.min(OUTAGE_CEILING_MS, outageBackoffMs * 2);
}

export function resetOutageCircuit(): void {
  outageUntil = 0;
  outageBackoffMs = OUTAGE_BASE_MS;
}

function networkError(
  url: string,
  requestInit: Omit<RequestInit, "headers" | "signal" | "credentials">,
  path: string,
  cause: string,
): ApiError {
  const host = requestHost(url);
  const upperMethod = (requestInit.method ?? "GET").toUpperCase();
  const target = host ? `contacting ${host} ` : "";
  return new ApiError(
    `Network error ${target}(${upperMethod} ${path}). Check your connection and try again.`,
    undefined,
    "NETWORK_ERROR",
    { method: upperMethod, path, host, cause },
    path,
  );
}

async function fetchOrThrowTransportError(
  url: string,
  requestInit: Omit<RequestInit, "headers" | "signal" | "credentials">,
  headers: Headers,
  signal: AbortSignal,
  path: string,
): Promise<Response> {
  if (Date.now() < outageUntil)
    throw networkError(url, requestInit, path, "Server unavailable; retrying shortly.");
  try {
    const res = await fetch(url, { ...requestInit, headers, credentials: "omit", signal });
    if (
      OUTAGE_STATUSES.has(res.status) &&
      !(res.headers.get("content-type") ?? "").includes("json")
    )
      noteOriginOutage();
    else resetOutageCircuit();
    return res;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError(
        "Request timed out. Please try again.",
        undefined,
        "TIMEOUT",
      );
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request was cancelled.", undefined, "ABORTED");
    }
    noteOriginOutage();
    throw networkError(
      url,
      requestInit,
      path,
      error instanceof Error ? error.message : String(error),
    );
  }
}

type NoAbortSignal = {
  readonly aborted?: never;
  readonly addEventListener?: never;
  readonly throwIfAborted?: never;
};

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

export { ApiError, isApiError, getApiErrorCode } from "@/lib/api-envelope";

function beginContract<T>(
  contract?: ContractSource<T>,
): Promise<ResponseContract<T> | undefined> {
  const pending = resolveContract(contract);
  void pending.catch(() => undefined);
  return pending;
}


async function get<T>(
  url: string,
  params?: QueryParams,
  signal?: AbortSignal,
  contract?: ContractSource<T>,
): Promise<T> {
  const pendingContract = beginContract(contract);
  const res = await authedFetch(
    buildUrl(url, params),
    { method: "GET", headers: { "Content-Type": "application/json" } },
    url,
    signal,
  );
  return parseApiResponse<T>(res, await pendingContract, url);
}

export interface RequestConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  asRealUser?: boolean;
  expectedIdentity?: ExpectedRequestIdentity;
}

export async function request(
  url: string,
  init: RequestInit,
  config?: RequestConfig,
): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(config?.headers ?? {}))
    headers.set(name, value);
  return authedFetch(
    buildUrl(url),
    { ...init, headers },
    url,
    config?.signal,
    config?.timeoutMs !== undefined || config?.asRealUser === true || config?.expectedIdentity !== undefined
      ? {
          ...(config.timeoutMs !== undefined
            ? { timeoutMs: config.timeoutMs }
            : {}),
          ...(config.asRealUser === true ? { asRealUser: true } : {}),
          ...(config.expectedIdentity !== undefined ? { expectedIdentity: config.expectedIdentity } : {}),
        }
      : undefined,
  );
}

async function post<T>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
  contract?: ContractSource<T>,
): Promise<T> {
  const pendingContract = beginContract(contract);
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
    config?.timeoutMs !== undefined || config?.expectedIdentity !== undefined
      ? { ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}), ...(config.expectedIdentity !== undefined ? { expectedIdentity: config.expectedIdentity } : {}) }
      : undefined,
  );
  return parseApiResponse<T>(res, await pendingContract, url);
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
  contract?: ContractSource<T>,
): Promise<T> {
  const pendingContract = beginContract(contract);
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
    resolved.asRealUser === true || resolved.expectedIdentity !== undefined
      ? { ...(resolved.asRealUser === true ? { asRealUser: true } : {}), ...(resolved.expectedIdentity !== undefined ? { expectedIdentity: resolved.expectedIdentity } : {}) }
      : undefined,
  );
  return parseApiResponse<T>(res, await pendingContract, url);
}

async function put<T>(
  url: string,
  data?: unknown,
  config?: AbortSignal | RequestConfig,
  contract?: ContractSource<T>,
): Promise<T> {
  return mutate<T>("PUT", url, data, config, contract);
}

async function patch<T>(
  url: string,
  data?: unknown,
  config?: AbortSignal | RequestConfig,
  contract?: ContractSource<T>,
): Promise<T> {
  return mutate<T>("PATCH", url, data, config, contract);
}

async function del<T>(
  url: string,
  data?: unknown,
  config?: AbortSignal | RequestConfig,
  contract?: ContractSource<T>,
): Promise<T> {
  return mutate<T>("DELETE", url, data, config, contract);
}

async function upload<T>(
  url: string,
  formData: FormData,
  contract?: ContractSource<T>,
  config?: RequestConfig,
): Promise<T> {
  const pendingContract = beginContract(contract);
  const res = await authedFetch(
    buildUrl(url),
    { method: "POST", headers: config?.headers, body: formData },
    url,
    config?.signal,
  );
  return parseApiResponse<T>(res, await pendingContract, url);
}

export interface DownloadConfig {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  onResponseHeaders?: (headers: Headers) => void;
}

async function download(
  url: string,
  params?: QueryParams,
  config?: DownloadConfig,
): Promise<Blob> {
  const method = config?.method ?? "GET";
  const init: RequestInit = { method, signal: config?.signal };
  if (method === "POST" && config?.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(config.body);
  }
  const res = await authedFetch(buildUrl(url, params), init, url);
  if (!res.ok) throw await apiErrorFromResponse(res);
  config?.onResponseHeaders?.(res.headers);
  return res.blob();
}

export const apiClient = {
  request,
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
  download,
} as const;
