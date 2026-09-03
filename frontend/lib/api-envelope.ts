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

/**
 * THE POLICY: a contract violation THROWS. Every time — reads and writes,
 * development and production. The alternative, reporting it and handing the
 * payload through, is today's default behaviour with a log line attached, and
 * today's default behaviour is what shipped the two chat defects. It was
 * considered and rejected. The `never` return type is the policy in the type
 * system; this comment is the policy in prose, and both are here so that
 * changing it means changing something named rather than editing a branch.
 *
 * 1. A contract cannot fail cosmetically. `ResponseContract` is deliberately
 *    NOT `.strict()`, so an ADDED backend field passes — that is the
 *    backward-compatible deploy, and it is allowed. The only remaining ways to
 *    fail are a field removed, renamed or retyped: one this client declared and
 *    reads, which no longer arrives as declared. There is no benign case here
 *    to let through.
 *
 * 2. Wrong-but-plausible only beats an error state for whoever does not have to
 *    act on it. Both shipped defects rendered a normal-looking screen — an
 *    empty Favourites list, a huddle roster of "Unknown". Nobody files a bug
 *    against a page that looks fine, which is exactly why both survived clean
 *    typechecks on both sides for as long as they did. An error state is
 *    discoverable; a plausible wrong one is not.
 *
 * 3. The blast radius is already one query, not the app. The throw lands in
 *    that read's `error`; `readErrorReachesBoundary` then decides boundary or
 *    inline, the same as for any 500.
 *
 * THE ASYMMETRY THAT LOOKS RIGHT AND IS NOT: fail reads, but let a drifted
 * WRITE response through, since the mutation already committed and a thrown
 * error invites a duplicate retry and rolls back optimistic state the server
 * accepted. Sound in general, wrong here: the highest-consequence contracted
 * write in the product is `POST /organization/switch`, whose response is what
 * the session's active org is set from. Failing that one open is a cross-tenant
 * outcome, and one such route is enough to kill the rule.
 *
 * NO SEVERITY DIAL AND NO ENVIRONMENT SWITCH. Either one puts the silent path
 * back, one route at a time, with nothing to say which routes took it. A route
 * that genuinely cannot afford to fail closed should lose its contract instead,
 * where `check:response-contracts` counts it as unparsed and prints it.
 */
function rejectContractViolation(
  resource: string,
  status: number,
  zodIssues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): never {
  const issues: ContractIssue[] = zodIssues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => ({
      path: issuePath(issue.path),
      message: issue.message,
    }));
  const error = new ApiContractError(resource, status, issues);
  reportError(error, { resource, status, issues });
  throw error;
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
  return rejectContractViolation(resource, status, result.error.issues);
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
