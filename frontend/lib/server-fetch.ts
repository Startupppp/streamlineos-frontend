import "server-only";

import { cache } from "react";
import { BACKEND_URL } from "@/lib/backend-url";
import { ApiError, parseApiResponse } from "@/lib/api-envelope";
import { getServerAuth } from "@/lib/get-server-auth";

const TIMEOUT_MS = 8_000;

type ServerRequestInit = Omit<RequestInit, "headers" | "cache" | "signal">;

const serverFetch = cache(async <T>(token: string, path: string): Promise<T> => {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return parseApiResponse<T>(res);
});

export async function serverRequest<T>(
  method: string,
  path: string,
  init: ServerRequestInit = {},
): Promise<T> {
  const session = await getServerAuth();
  const token = session?.backendJwt;
  if (!token) throw new ApiError("Not authenticated", 401, "UNAUTHENTICATED");
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: typeof init.body === "string" ? init.body : init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return parseApiResponse<T>(res);
}

export async function serverGet<T>(path: string): Promise<T> {
  const session = await getServerAuth();
  const token = session?.backendJwt;
  if (!token) throw new ApiError("Not authenticated", 401, "UNAUTHENTICATED");
  return serverFetch<T>(token, path);
}

export const serverPost = <T>(path: string, body?: unknown) =>
  serverRequest<T>("POST", path, { body: body === undefined ? undefined : JSON.stringify(body) });
