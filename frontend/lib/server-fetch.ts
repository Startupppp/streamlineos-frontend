import "server-only";

import { cache } from "react";
import { BACKEND_URL } from "@/lib/backend-url";
import { ApiError, parseApiResponse } from "@/lib/api-envelope";
import { getServerAuth } from "@/lib/get-server-auth";

const TIMEOUT_MS = 8_000;

type ServerRequestInit = Omit<RequestInit, "headers" | "cache" | "signal">;

/** One authenticated server-to-backend transport used by GET and mutations. */
async function requestWithToken<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return parseApiResponse<T>(res);
}

const serverFetch = cache(async <T>(token: string, path: string): Promise<T> => {
  return requestWithToken<T>(token, path, { method: "GET" });
});

async function getServerToken(): Promise<string> {
  const session = await getServerAuth();
  const token = session?.backendJwt;
  if (!token) throw new ApiError("Not authenticated", 401, "UNAUTHENTICATED");
  return token;
}

export async function serverRequest<T>(
  method: string,
  path: string,
  init: ServerRequestInit = {},
): Promise<T> {
  const token = await getServerToken();
  return requestWithToken<T>(token, path, {
    ...init,
    method,
    body:
      typeof init.body === "string"
        ? init.body
        : init.body === undefined
          ? undefined
          : JSON.stringify(init.body),
  });
}

export async function serverGet<T>(path: string): Promise<T> {
  return serverFetch<T>(await getServerToken(), path);
}

export const serverPost = <T>(path: string, body?: unknown) =>
  serverRequest<T>("POST", path, {
    body: body === undefined ? undefined : JSON.stringify(body),
  });
