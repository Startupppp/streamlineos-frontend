import "server-only";

import { cache } from "react";
import { getServerAuth } from "@/lib/get-server-auth";
import { BACKEND_URL } from "@/lib/backend-url";
import { ApiError, parseApiResponse } from "@/lib/api-envelope";

const REQUEST_TIMEOUT_MS = 8_000;

async function requestFromServer<T>(path: string, search?: string): Promise<T> {
  const session = await getServerAuth();
  const token = session?.backendJwt;
  if (!token) throw new ApiError("Not authenticated", 401, "UNAUTHENTICATED");

  const url = `${BACKEND_URL}${path}${search ?? ""}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError("Network error", undefined, "NETWORK");
  }
  return parseApiResponse<T>(res);
}

function toSearch(params?: Record<string, unknown>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

const cachedRequest = cache(
  async (path: string, search: string): Promise<unknown> =>
    requestFromServer<unknown>(path, search),
);

export async function serverFetch<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return (await cachedRequest(path, toSearch(params))) as T;
}
