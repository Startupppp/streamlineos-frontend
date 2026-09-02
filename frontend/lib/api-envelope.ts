import type { ZodType } from "zod";
import { reportError } from "@/lib/observability/error-reporter";

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

export const CONTRACT_VIOLATION_CODE = "CONTRACT_VIOLATION";

const CONTRACT_VIOLATION_MESSAGE =
  "The server sent data this screen does not understand. Refresh to try again — if it keeps happening, this app is out of date with the API.";

const MAX_REPORTED_ISSUES = 10;

export interface ContractIssue {
  readonly path: string;
  readonly message: string;
}

/**
 * A response contract. Every Zod schema is one; nothing else needs to be.
 * Contracts are deliberately NOT `.strict()`: an added backend field is a
 * backward-compatible deploy, while a removed, renamed or retyped field is the
 * drift this exists to catch — and a plain object already rejects all three.
 */
export type ResponseContract<T> = ZodType<T>;

/**
 * A backend response that did not match the contract the caller declared.
 * It is an `ApiError`, so `getErrorMessage`, `readErrorReachesBoundary` and
 * every existing error surface render it without a special case — a contract
 * violation reaches the screen as an error state, never as a raw `ZodError`
 * escaping into an unhandled rejection, and never as a silent pass.
 */
export class ApiContractError extends ApiError {
  readonly resource: string;
  readonly issues: readonly ContractIssue[];

  constructor(
    resource: string,
    status: number | undefined,
    issues: readonly ContractIssue[],
  ) {
    super(CONTRACT_VIOLATION_MESSAGE, status, CONTRACT_VIOLATION_CODE, {
      resource,
      issues,
    });
    this.name = "ApiContractError";
    this.resource = resource;
    this.issues = issues;
  }
}

export function isContractViolation(
  error: unknown,
): error is ApiContractError {
  return error instanceof ApiContractError;
}

export interface ApiResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  json(): Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapEnvelope(body: unknown): unknown {
  if (isRecord(body) && body.success === true && "data" in body) return body.data;
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

function applyContract<T>(
  payload: unknown,
  contract: ResponseContract<T> | undefined,
  resource: string,
  status: number,
): T {
  if (contract === undefined) return assertUnchecked<T>(payload);
  const result = contract.safeParse(payload);
  if (result.success) return result.data;
  const issues: ContractIssue[] = result.error.issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => ({
      path: issuePath(issue.path),
      message: issue.message,
    }));
  const error = new ApiContractError(resource, status, issues);
  reportError(error, { resource, status, issues });
  throw error;
}

async function readErrorBody(res: ApiResponseLike): Promise<ApiError> {
  let message = `${res.status} ${res.statusText}`;
  let code: string | undefined;
  let details: unknown;
  try {
    const body = await res.json();
    if (!isRecord(body)) return new ApiError(message, res.status, code, details);
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
  return new ApiError(message, res.status, code, details);
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
): Promise<T> {
  if (!res.ok) throw await readErrorBody(res);
  if (res.status === 204)
    return applyContract<T>(undefined, contract, resource, res.status);
  const body = await res.json();
  return applyContract<T>(
    unwrapEnvelope(body),
    contract,
    resource,
    res.status,
  );
}
