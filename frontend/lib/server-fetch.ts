import "server-only";

import { cache } from "react";
import { BACKEND_URL } from "@/lib/backend-url";
import { ApiError, parseApiResponse } from "@/lib/api-envelope";
import { getServerAuth } from "@/lib/get-server-auth";

const TIMEOUT_MS = 8_000;

const serverFetch = cache(async <T>(token: string, path: string): Promise<T> => {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return parseApiResponse<T>(res);
});

export async function serverGet<T>(path: string): Promise<T> {
  const session = await getServerAuth();
  const token = session?.backendJwt;
  if (!token) throw new ApiError("Not authenticated", 401, "UNAUTHENTICATED");
  return serverFetch<T>(token, path);
}
