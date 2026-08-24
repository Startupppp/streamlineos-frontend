export class ApiError extends Error {
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
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiErrorCode(error: unknown): string | undefined {
  return isApiError(error) ? error.code : undefined;
}

export interface ApiResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  json(): Promise<unknown>;
}

export async function parseApiResponse<T>(res: ApiResponseLike): Promise<T> {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    let code: string | undefined;
    let details: unknown;
    try {
      const body = (await res.json()) as Record<string, unknown>;
      if (typeof body?.message === "string" && body.message) {
        message = body.message;
      } else if (Array.isArray(body?.message) && body.message.length > 0) {
        message = body.message
          .filter((m): m is string => typeof m === "string")
          .join(", ");
      } else if (typeof body?.error === "string" && body.error) {
        message = body.error;
      }
      if (typeof body?.code === "string") code = body.code;
      if ("details" in body) {
        details = body.details;
      } else {
        const {
          message: _m,
          error: _e,
          code: _c,
          statusCode: _s,
          success: _su,
          ...rest
        } = body;
        if (Object.keys(rest).length > 0) details = rest;
      }
    } catch {}
    throw new ApiError(message, res.status, code, details);
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
