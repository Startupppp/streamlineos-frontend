import type { ZodType } from "zod";
import { isRecord } from "@/lib/is-record";
import { reportError } from "@/lib/observability/error-reporter";

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly endpoint?: string;

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: unknown,
    endpoint?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.endpoint = endpoint;
  }
}

export function getRetryAfterSeconds(error: unknown): number | undefined {
  if (!isApiError(error) || !isRecord(error.details)) return undefined;
  const seconds = error.details.retryAfterSecs;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0
    ? seconds
    : undefined;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiErrorCode(error: unknown): string | undefined {
  return isApiError(error) ? error.code : undefined;
}

export function getCorrelationId(error: unknown): string | undefined {
  if (!isApiError(error) || !isRecord(error.details)) return undefined;
  const id = error.details.correlationId;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export const CONTRACT_VIOLATION_CODE = "CONTRACT_VIOLATION";

const CONTRACT_VIOLATION_MESSAGE =
  "The server sent data this screen does not understand. Refresh to try again — if it keeps happening, this app is out of date with the API.";

const MAX_REPORTED_ISSUES = 10;

export interface ContractIssue {
  readonly path: string;
  readonly message: string;
}

export type ResponseContract<T> = ZodType<T>;

export type LazyResponseContract<T> = () => Promise<ResponseContract<T>>;

/** A contract, or the promise of one. Both validate; only the timing differs. */
export type ContractSource<T> = ResponseContract<T> | LazyResponseContract<T>;

export function lazyContract<T>(
  load: LazyResponseContract<T>,
): LazyResponseContract<T> {
  let pending: Promise<ResponseContract<T>> | undefined;
  return () => {
    if (pending === undefined)
      pending = load().catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
    return pending;
  };
}

/**
 * A Zod schema is an object in Zod 4, never callable, so a function in this slot
 * is unambiguously a loader.
 */
export function resolveContract<T>(
  source: ContractSource<T> | undefined,
): Promise<ResponseContract<T> | undefined> {
  if (typeof source === "function") return source();
  return Promise.resolve(source);
}

export class ApiContractError extends ApiError {
  readonly resource: string;
  readonly issues: readonly ContractIssue[];

  constructor(
    resource: string,
    status: number | undefined,
    issues: readonly ContractIssue[],
    correlationId?: string,
  ) {
    super(
      CONTRACT_VIOLATION_MESSAGE,
      status,
      CONTRACT_VIOLATION_CODE,
      { resource, issues, ...(correlationId ? { correlationId } : {}) },
      resource,
    );
    this.name = "ApiContractError";
    this.resource = resource;
    this.issues = issues;
  }
}

export function isContractViolation(error: unknown): error is ApiContractError {
  return error instanceof ApiContractError;
}

export interface ApiResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers?: { get(name: string): string | null };
  json(): Promise<unknown>;
}

function responseCorrelationId(res: ApiResponseLike): string | undefined {
  try {
    return res.headers?.get("x-correlation-id") ?? undefined;
  } catch {
    return undefined;
  }
}

function unwrapEnvelope(body: unknown): unknown {
  if (isRecord(body) && body.success === true && "data" in body)
    return body.data;
  return body;
}

function issuePath(path: ReadonlyArray<PropertyKey>): string {
  return path.length === 0 ? "(root)" : path.map(String).join(".");
}

/**
 * The unchecked path. With no contract the body is *asserted* to be `T`, never
 * verified — the single cast in this module lives here, and it is the whole
 * reason a contract argument exists. Anything read through this path accepts a
 * backend rename silently and surfaces it later as an undefined field.
 */
function assertUnchecked<T>(payload: unknown): T {
  return payload as T;
}

function rejectContractViolation(
  resource: string,
  status: number,
  zodIssues: ReadonlyArray<{
    path: ReadonlyArray<PropertyKey>;
    message: string;
  }>,
  correlationId?: string,
): never {
  const issues: ContractIssue[] = zodIssues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => ({
      path: issuePath(issue.path),
      message: issue.message,
    }));
  const error = new ApiContractError(resource, status, issues, correlationId);
  reportError(error, { resource, status, issues, correlationId });
  throw error;
}

function applyContract<T>(
  payload: unknown,
  contract: ResponseContract<T> | undefined,
  resource: string,
  status: number,
  correlationId?: string,
): T {
  if (contract === undefined) return assertUnchecked<T>(payload);
  const result = contract.safeParse(payload);
  if (result.success) return result.data;
  return rejectContractViolation(resource, status, result.error.issues, correlationId);
}

/**
 * The refusal half of `parseApiResponse`, on its own.
 *
 * A response whose body is not JSON — a CSV download, a file — still refuses in
 * exactly the same envelope, and until this was separable the download path had
 * its own reader: it took `body.error` and nothing else, so NestJS's `message`
 * (where the actual sentence lives), the status, the code and the `details`
 * carrying field-level validation issues were all discarded. One parser now
 * builds the error for both.
 */
export async function apiErrorFromResponse(
  res: ApiResponseLike,
  endpoint?: string,
  correlationId?: string,
): Promise<ApiError> {
  let message = `${res.status} ${res.statusText}`;
  let code: string | undefined;
  let details: unknown;
  try {
    const body = await res.json();
    if (!isRecord(body))
      return new ApiError(
        message,
        res.status,
        code,
        withCorrelationId(details, correlationId),
        endpoint,
      );
    if (typeof body.message === "string" && body.message) {
      message = body.message;
    } else if (Array.isArray(body.message) && body.message.length > 0) {
      message = body.message
        .filter((m): m is string => typeof m === "string")
        .join(", ");
    } else if (typeof body.error === "string" && body.error) {
      message = body.error;
    }
    if (typeof body.code === "string") code = body.code;
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
  return new ApiError(
    message,
    res.status,
    code,
    withCorrelationId(details, correlationId),
    endpoint,
  );
}

function withCorrelationId(details: unknown, correlationId?: string): unknown {
  if (correlationId === undefined) return details;
  if (details === undefined) return { correlationId };
  if (isRecord(details)) return { ...details, correlationId };
  return { details, correlationId };
}

/**
 * The one seam every response passes through — `apiClient`, `serverGet` and
 * `publicGet` all end here. Pass a `contract` and the body is validated at
 * runtime; omit it and the body is cast unchecked (see `assertUnchecked`).
 */
export async function parseApiResponse<T>(
  res: ApiResponseLike,
  contract?: ResponseContract<T>,
  resource = "response",
  correlationId?: string,
): Promise<T> {
  const requestId = correlationId ?? responseCorrelationId(res);
  if (!res.ok) throw await apiErrorFromResponse(res, resource, requestId);
  if (res.status === 204)
    return applyContract<T>(undefined, contract, resource, res.status, requestId);
  const body = await res.json();
  return applyContract<T>(
    unwrapEnvelope(body),
    contract,
    resource,
    res.status,
    requestId,
  );
}
