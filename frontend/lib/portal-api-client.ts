import { withCorrelation } from "@/lib/observability/with-correlation";
import { isRecord } from "@/lib/is-record";

if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL;
const PORTAL_TOKEN_KEY = "portal_jwt";

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PORTAL_TOKEN_KEY);
}

const tokenListeners = new Set<() => void>();

function notifyPortalTokenChanged(): void {
  for (const listener of [...tokenListeners]) listener();
}

/**
 * The portal has no session, so nothing else tells the cache that the subject
 * changed. `(portal)` is one layout across the invitation page and the board,
 * so accepting a second client's invitation in the same browser previously kept
 * the first client's QueryClient — and `queryKeys.portal.projects()` carries no
 * subject dimension, so customer B read customer A's project list out of cache.
 */
export function subscribePortalToken(listener: () => void): () => void {
  tokenListeners.add(listener);
  if (typeof window !== "undefined") window.addEventListener("storage", listener);
  return () => {
    tokenListeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", listener);
  };
}

export const PORTAL_ANONYMOUS_SCOPE = "portal:anonymous";

/**
 * A short, stable digest of the bearer token — enough to key one client's cache
 * apart from another's, and not the token itself sitting in a cache key.
 */
export function portalTokenScope(): string {
  const token = getPortalToken();
  if (!token) return PORTAL_ANONYMOUS_SCOPE;
  let hash = 5381;
  for (let i = 0; i < token.length; i += 1)
    hash = (Math.imul(hash, 33) + token.charCodeAt(i)) | 0;
  return `portal:${(hash >>> 0).toString(36)}`;
}

export function setPortalToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PORTAL_TOKEN_KEY, token);
  notifyPortalTokenChanged();
}

export function clearPortalToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PORTAL_TOKEN_KEY);
  notifyPortalTokenChanged();
}

export class PortalApiError extends Error {
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
    this.name = "PortalApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = `${BACKEND_API_URL}${path}`;
  if (!params || Object.keys(params).length === 0) return url;
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return search ? `${url}?${search}` : url;
}

async function parsePortalResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    let code: string | undefined;
    let details: unknown;
    try {
      const body: unknown = await res.json();
      if (isRecord(body)) {
        if (typeof body.message === "string" && body.message) {
          message = body.message;
        } else if (Array.isArray(body.message) && body.message.length > 0) {
          const parts: unknown[] = body.message;
          message = parts
            .filter((m): m is string => typeof m === "string")
            .join(", ");
        } else if (typeof body.error === "string" && body.error) {
          message = body.error;
        }
        if (typeof body.code === "string") code = body.code;
        if ("details" in body) details = body.details;
      }
    } catch {}
    throw new PortalApiError(message, res.status, code, details);
  }
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json();
  if (isRecord(body) && body.success === true && "data" in body) return body.data as T;
  return body as T;
}

async function portalFetch(
  url: string,
  init: RequestInit,
  authenticated = true,
): Promise<Response> {
  const headers = withCorrelation(new Headers(init.headers));
  if (authenticated) {
    const token = getPortalToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, credentials: "omit" });
  } catch {
    throw new PortalApiError(
      "Network error. Check your connection and try again.",
      undefined,
      "NETWORK_ERROR",
    );
  }

  if (authenticated && res.status === 401) {
    clearPortalToken();
    if (typeof window !== "undefined") {
      // The invitation page lives in the `(portal)` route group, which adds no URL segment.
      // `/portal/accept-invitation` resolved into the authenticated staff area instead.
      window.location.href = "/accept-invitation?reason=expired";
    }
    throw new PortalApiError(
      "Your portal session has expired. Please use your invitation link.",
      401,
    );
  }

  return res;
}

async function get<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const res = await portalFetch(buildUrl(url, params), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return parsePortalResponse<T>(res);
}

async function post<T>(
  url: string,
  data?: unknown,
  opts?: { authenticated?: boolean; headers?: Record<string, string> },
): Promise<T> {
  const res = await portalFetch(
    buildUrl(url),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts?.headers ?? {}),
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    opts?.authenticated ?? true,
  );
  return parsePortalResponse<T>(res);
}

export const portalApiClient = { get, post } as const;
