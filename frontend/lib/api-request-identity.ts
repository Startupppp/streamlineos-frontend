import { z } from "zod";
import { ApiError } from "./api-envelope";
import { isRecord } from "./is-record";

const identifier = z.string().min(1).max(128);
export const expectedRequestIdentitySchema = z.object({ userId: identifier, orgId: identifier, sessionId: identifier }).strict();
export type ExpectedRequestIdentity = z.infer<typeof expectedRequestIdentitySchema>;

export function assertRequestIdentity(token: string | null, expected: ExpectedRequestIdentity | undefined, signal: AbortSignal, impersonating: boolean): void {
  if (signal.aborted) throw new ApiError("Request was cancelled.", undefined, "ABORTED");
  if (expected === undefined) return;
  const identity = expectedRequestIdentitySchema.safeParse(expected);
  let claims: unknown;
  try {
    const parts = token?.split(".");
    const payload = parts?.length === 3 ? parts[1] : undefined;
    if (payload && /^[A-Za-z0-9_-]+$/.test(payload)) claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    claims = undefined;
  }
  if (impersonating || !identity.success || !isRecord(claims) || claims.sub !== identity.data.userId || claims.orgId !== identity.data.orgId || claims.sessionId !== identity.data.sessionId)
    throw new ApiError("Your signed-in account changed. Retry from the current account.", undefined, "REQUEST_IDENTITY_CHANGED");
}
