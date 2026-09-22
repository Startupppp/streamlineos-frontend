import { getRetryAfterSeconds, isApiError } from "@/lib/api-envelope";

export function readErrorReachesBoundary(
  error: unknown,
  query: { readonly state: { readonly data: unknown } },
): boolean {
  if (query.state.data !== undefined) return false;
  if (!isApiError(error)) return true;
  if (error.code === "ABORTED") return false;
  if (error.status === 401) return false;
  if (error.status === 402) return false;
  if (error.status === 403) return false;
  return true;
}

export const INLINE_READ_ERROR = { throwOnError: false } as const;

export async function optionalSignalRead<T>(
  read: Promise<T>,
): Promise<T | null> {
  try {
    return await read;
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
}

export function isTransientNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.name === "AccessUnavailableError")
    return true;
  if (!isApiError(error)) return false;
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") return true;
  if (error.status === 502 || error.status === 503 || error.status === 504)
    return true;
  return false;
}

const DEFAULT_BASE_MS = 1_000;
const DEFAULT_CEILING_MS = 30_000;
const RETRY_AFTER_CEILING_MS = 60_000;

export function queryRetryDelay(failureCount: number, error: unknown): number {
  const retryAfter = getRetryAfterSeconds(error);
  if (retryAfter !== undefined)
    return Math.min(
      RETRY_AFTER_CEILING_MS,
      Math.max(DEFAULT_BASE_MS, retryAfter * 1_000),
    );
  return Math.min(DEFAULT_CEILING_MS, DEFAULT_BASE_MS * 2 ** failureCount);
}
