import "server-only";

import { cache } from "react";
import { BACKEND_URL } from "@/lib/backend-url";
import { ApiError, parseApiResponse } from "@/lib/api-envelope";
import { getServerAuth } from "@/lib/get-server-auth";

const TIMEOUT_MS = 8_000;

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

export async function serverGet<T>(path: string): Promise<T> {
  return serverFetch<T>(await getServerToken(), path);
}
