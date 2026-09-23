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
    if (error instanceof DOMException && error.name === "AbortError") throw error;
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

const serverFetch = cache(
  async <T>(
    token: string,
    path: string,
    contract?: ResponseContract<T>,
  ): Promise<T> => {
    return requestWithToken<T>(token, path, { method: "GET" }, contract);
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
