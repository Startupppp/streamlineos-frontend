import "server-only";

import { cache } from "react";
import { BACKEND_URL } from "@/lib/backend-url";
import {
  ApiError,
  parseApiResponse,
  type ResponseContract,
} from "@/lib/api-envelope";
import { getServerAuth } from "@/lib/get-server-auth";
import {
  CORRELATION_HEADER,
  withCorrelation,
} from "@/lib/observability/with-correlation";

const TIMEOUT_MS = 8_000;

async function requestWithToken<T>(
  token: string,
  path: string,
  init: RequestInit = {},
  contract?: ResponseContract<T>,
): Promise<T> {
  const headers = withCorrelation(new Headers(init.headers));
  const correlationId = headers.get(CORRELATION_HEADER) ?? undefined;
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error: unknown) {
    throw new ApiError(
      "The service is taking too long to respond. Please try again.",
      503,
      "BACKEND_UNREACHABLE",
      {
        path,
        correlationId,
        cause: error instanceof Error ? error.message : String(error),
      },
    );
  }
  return parseApiResponse<T>(res, contract, path, correlationId);
}

const ACCESS_SNAPSHOT_PATH = "/me/access";
/** Repeat navigations reuse a successful snapshot. The session token is the key, so an org switch or impersonation misses. Failures are not stored. */
const ACCESS_SNAPSHOT_FRESH_MS = 15_000;

type FreshAccess = { expiresAt: number; value: unknown };

const freshAccessByToken = new Map<string, FreshAccess>();

function takeFreshAccess<T>(token: string): T | undefined {
  const hit = freshAccessByToken.get(token);
  if (hit === undefined) return undefined;
  if (hit.expiresAt <= Date.now()) {
    freshAccessByToken.delete(token);
    return undefined;
  }
  return hit.value as T;
}

function storeFreshAccess(token: string, value: unknown): void {
  const now = Date.now();
  if (freshAccessByToken.size >= 32) {
    for (const [key, entry] of freshAccessByToken) {
      if (entry.expiresAt <= now) freshAccessByToken.delete(key);
    }
  }
  if (freshAccessByToken.size >= 32) {
    const oldest = freshAccessByToken.keys().next().value;
    if (oldest !== undefined) freshAccessByToken.delete(oldest);
  }
  freshAccessByToken.set(token, {
    expiresAt: now + ACCESS_SNAPSHOT_FRESH_MS,
    value,
  });
}

const serverFetch = cache(
  async <T>(
    token: string,
    path: string,
    contract?: ResponseContract<T>,
  ): Promise<T> => {
    if (path === ACCESS_SNAPSHOT_PATH) {
      const fresh = takeFreshAccess<T>(token);
      if (fresh !== undefined) return fresh;
    }
    const value = await requestWithToken<T>(token, path, { method: "GET" }, contract);
    if (path === ACCESS_SNAPSHOT_PATH) storeFreshAccess(token, value);
    return value;
  },
);

async function getServerToken(): Promise<string> {
  const session = await getServerAuth();
  const token = session?.backendJwt;
  if (!token) throw new ApiError("Not authenticated", 401, "UNAUTHENTICATED");
  return token;
}

export async function serverGet<T>(
  path: string,
  contract?: ResponseContract<T>,
): Promise<T> {
  return serverFetch<T>(await getServerToken(), path, contract);
}
