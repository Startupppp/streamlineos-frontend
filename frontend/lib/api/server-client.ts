import "server-only";
import axios, { isAxiosError, type AxiosRequestConfig } from "axios";
import { SignJWT } from "jose";
import { getServerAuth } from "@/lib/get-server-auth";
import { ApiError } from "@/lib/api-client";
import { BACKEND_URL as BACKEND } from "@/lib/backend-url";

const NETWORK_ERROR_PATTERN =
  /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EHOSTUNREACH|ECONNRESET|socket hang up|Network Error|fetch failed/i;

function backendUnreachableMessage(): string {
  return `Backend API is unreachable at ${BACKEND}. Start the NestJS server (pnpm -C backend dev) and confirm NEXT_PUBLIC_API_URL.`;
}

function extractNestedErrorMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    for (const inner of error.errors) {
      const nested = extractNestedErrorMessage(inner);
      if (nested) return nested;
    }
  }
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as { errors?: unknown }).errors;
    if (Array.isArray(errors)) {
      for (const inner of errors) {
        const nested = extractNestedErrorMessage(inner);
        if (nested) return nested;
      }
    }
  }
  if (error instanceof Error) return error.message.trim();
  return "";
}

function hasNetworkErrorCode(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "EHOSTUNREACH" ||
    code === "ECONNRESET"
  );
}

function isBackendUnreachable(error: unknown): boolean {
  if (hasNetworkErrorCode(error)) return true;
  const message = extractNestedErrorMessage(error);
  return NETWORK_ERROR_PATTERN.test(message);
}

function parseErrorBody(rawData: unknown): { message?: string; code?: string; details?: unknown } {
  if (rawData === null || typeof rawData !== "object") return {};
  const body = rawData as Record<string, unknown>;
  let message: string | undefined;
  if (typeof body.message === "string" && body.message) {
    message = body.message;
  } else if (Array.isArray(body.message) && body.message.length > 0) {
    message = body.message.filter((entry): entry is string => typeof entry === "string").join(", ");
  } else if (typeof body.error === "string" && body.error) {
    message = body.error;
  }
  const code = typeof body.code === "string" ? body.code : undefined;
  const details = "details" in body ? body.details : undefined;
  return { message, code, details };
}

function normalizeRequestError(error: unknown): never {
  if (error instanceof ApiError) throw error;

  if (isAxiosError(error)) {
    const { message: bodyMessage, code, details } = parseErrorBody(error.response?.data);
    const status = error.response?.status;
    const message = bodyMessage ?? error.message;
    if (!error.response && isBackendUnreachable(error)) {
      throw new ApiError(backendUnreachableMessage(), undefined, "BACKEND_UNREACHABLE");
    }
    throw new ApiError(message, status, code, details);
  }

  if (isBackendUnreachable(error)) {
    throw new ApiError(backendUnreachableMessage(), undefined, "BACKEND_UNREACHABLE");
  }

  const message = extractNestedErrorMessage(error);
  if (message) throw new ApiError(message);
  throw new ApiError("Something went wrong. Please try again.");
}

const MINTED_TOKEN_TTL_MS = 5 * 60 * 1000;
const mintedTokenStore = new Map<string, { token: string; expiresAt: number }>();

async function mintBackendToken(): Promise<string | null> {
  const session = await getServerAuth();
  if (!session?.user?.id || !session.orgId) return null;
  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) return null;
  const cacheKey = `${session.user.id}:${session.orgId}:${session.sessionId ?? ""}:${session.user.role}`;
  const cached = mintedTokenStore.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const token = await new SignJWT({
    orgId: session.orgId,
    branchId: session.branchId ?? null,
    role: session.user.role,
    enabledModules: session.enabledModules ?? [],
    plan: session.plan ?? null,
    isOrgOwner: session.user.isOrgOwner === true,
    sessionId: session.sessionId ?? "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
  mintedTokenStore.set(cacheKey, { token, expiresAt: Date.now() + MINTED_TOKEN_TTL_MS });
  return token;
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(`${BACKEND}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function unwrapResponse<T>(body: unknown): T {
  if (body !== null && typeof body === "object" && "success" in body) {
    const envelope = body as Record<string, unknown>;
    if (envelope.success === true && "data" in envelope) {
      return envelope.data as T;
    }
  }
  return body as T;
}

async function request<T>(method: string, path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  const token = await mintBackendToken();
  if (!token) {
    throw new ApiError("Your session expired. Please sign in again.", 401, "AUTH_NO_SESSION");
  }
  const config: AxiosRequestConfig = {
    method,
    url: buildUrl(path, params),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    data: body,
  };
  try {
    const res = await axios(config);
    return unwrapResponse<T>(res.data);
  } catch (error: unknown) {
    normalizeRequestError(error);
  }
}

export const serverApiClient = {
  get: <T>(path: string, params?: Record<string, unknown>) => request<T>("GET", path, undefined, params),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};

async function publicRequest<T>(method: string, path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  const config: AxiosRequestConfig = {
    method,
    url: buildUrl(path, params),
    headers: { "Content-Type": "application/json" },
    data: body,
  };
  try {
    const res = await axios(config);
    return unwrapResponse<T>(res.data);
  } catch (error: unknown) {
    normalizeRequestError(error);
  }
}

export const serverPublicFetch = {
  get: <T>(path: string, params?: Record<string, unknown>) => publicRequest<T>("GET", path, undefined, params),
  post: <T>(path: string, body?: unknown) => publicRequest<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => publicRequest<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => publicRequest<T>("PUT", path, body),
  delete: <T>(path: string, body?: unknown) => publicRequest<T>("DELETE", path, body),
};
