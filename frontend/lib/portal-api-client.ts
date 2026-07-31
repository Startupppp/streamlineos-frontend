
if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL;
const PORTAL_TOKEN_KEY = "portal_jwt";

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function setPortalToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PORTAL_TOKEN_KEY, token);
}

export function clearPortalToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PORTAL_TOKEN_KEY);
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

export function isPortalApiError(error: unknown): error is PortalApiError {
  return error instanceof PortalApiError;
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
      const body = (await res.json()) as Record<string, unknown>;
      if (typeof body?.message === "string" && body.message) {
        message = body.message;
      } else if (Array.isArray(body?.message) && body.message.length > 0) {
        message = (body.message as unknown[])
          .filter((m): m is string => typeof m === "string")
          .join(", ");
      } else if (typeof body?.error === "string" && body.error) {
        message = body.error;
      }
      if (typeof body?.code === "string") code = body.code;
      if ("details" in body) details = body.details;
    } catch {}
    throw new PortalApiError(message, res.status, code, details);
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

async function portalFetch(
  url: string,
  init: RequestInit,
  authenticated = true,
): Promise<Response> {
  const headers = new Headers(init.headers);
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
      window.location.href = "/portal/accept-invitation?reason=expired";
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
  opts?: { authenticated?: boolean },
): Promise<T> {
  const res = await portalFetch(
    buildUrl(url),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    },
    opts?.authenticated ?? true,
  );
  return parsePortalResponse<T>(res);
}

export const portalApiClient = { get, post } as const;
