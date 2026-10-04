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
  /**
   * Overrides the ordinary request timeout, which is a deadline this client
   * imposes on the SERVER's work. A streamed AI answer is bounded by the
   * backend's own deadline — 120 s for chat, 60 s for the other stream routes —
   * so the 30 s every other call gets aborts a paid stream the server is still
   * producing. The surface renders that as a cancellation nobody asked for, and
   * the retry it invites reserves and spends a second time.
   */
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
  // BUG-HRMS-010: the invitee requesting this code has no session yet — that is
  // the whole point of it. Absent from this set, the call took the authenticated
  // path: a mutation key it does not need, and `endSession()` on the 401 that a
  // missing bearer invites, signing the visitor out of an invitation page.
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
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
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
    } catch {
      return null;
    } finally {
      if (generation === tokenGeneration) {
        if (minted === null)
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

/**
 * Re-exported because a caller that needs a key stable across *retries* has to
 * mint it once, outside the request. The per-fetch key below is minted inside
 * `authedFetch`, so a retried mutation would carry a new one and replay
 * nothing — which is fine for a request that is cheap to repeat and wrong for
 * one that spends money or holds a message. The key itself lives in
 * `lib/idempotency-key`; `hooks/common/use-idempotent-operation.ts` is the hook form.
 */
export { newIdempotencyKey };

export async function authedFetch(
  url: string,
  init: RequestInit,
  path: string,
  signal?: AbortSignal,
  options?: AuthedFetchOptions,
): Promise<Response> {
  // `init.signal` is destructured out rather than left to be shadowed by the
  // `signal:` written after the spread below — a caller that passed one had it
  // silently overwritten, which is what made `useAskAI`'s stop() a no-op.
  const { signal: initSignal, ...requestInit } = init;
  const headers = new Headers(init.headers);
  const isPublic = isPublicPath(path);
  const combinedSignal = makeRequestSignal(
    signal ?? initSignal ?? undefined,
    options?.timeoutMs,
  );

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

/**
 * Origin-outage circuit (SEC-HRMS-003). During an outage every layer above
 * retries on its own clock — query retry, the route boundary's auto-reset,
 * polling reads — so one tab hammered a down origin at ~60 req/min. Every
 * request passes through here, so this is the one place to stop it: a
 * transport failure or a gateway 502/503/504 opens the circuit for a backoff
 * window (5s doubling to 60s) during which requests fail fast with the same
 * NETWORK_ERROR the UI already shows as "Server temporarily unavailable".
 * The first request after the window is the probe; any other response proves
 * the origin is back and closes it.
 *
 * "Gateway" means a non-JSON body: the backend itself answers 503 (AI
 * provider down, mail unconfigured, …) in its JSON envelope, and that one
 * feature being degraded must not black out the whole app.
 */
const OUTAGE_BASE_MS = 5_000;
const OUTAGE_CEILING_MS = 60_000;
const OUTAGE_STATUSES = new Set([502, 503, 504]);
let outageUntil = 0;
let outageBackoffMs = OUTAGE_BASE_MS;

function noteOriginOutage(): void {
  // Requests already in flight when the outage began all fail together; only
  // the first may open (and lengthen) the window.
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

export { ApiError, isApiError, getApiErrorCode } from "@/lib/api-envelope";

/**
 * Starts a lazy contract downloading in PARALLEL with the request instead of
 * after it, so deferring the schema module costs the read nothing it would not
 * already have paid — the chunk and the response race, and the body is parsed
 * when both have landed.
 *
 * The `catch` is a no-op on purpose: it keeps a failed chunk download from
 * becoming an unhandled rejection when the request itself throws first. The
 * awaited read at each call site is still the one that reports the failure.
 */
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

/**
 * Sends an authenticated request through the same token cache, 401 recovery,
 * correlation, timeout, and outage circuit as the typed API helpers while
 * leaving the response body untouched. Use this for streaming handshakes and
 * other endpoints whose headers or non-JSON body are part of their contract.
 */
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
