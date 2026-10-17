import "server-only";

import { cache } from "react";
import { serverGet } from "@/lib/server-fetch";
import { isApiError } from "@/lib/api-envelope";
import {
  accessResponseContract,
  type AccessResponse,
} from "@/hooks/api/access-schema";

const DENIED: AccessResponse = {
  scopes: {},
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: {},
  mfa: { enforced: true, satisfied: false },
};

export type ServerAccessResult =
  | { ok: true; access: AccessResponse }
  | { ok: false; error: unknown };

const RETRY_DELAYS_MS = [250, 750, 1_500] as const;

function isTransientAccessFailure(error: unknown): boolean {
  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError"))
    return true;
  if (!isApiError(error)) return false;
  if (error.code === "TIMEOUT" || error.code === "BACKEND_UNREACHABLE" || error.code === "NETWORK_ERROR")
    return true;
  return error.status === 502 || error.status === 503 || error.status === 504;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function resolveServerAccess(): Promise<ServerAccessResult> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return {
        ok: true,
        access: await serverGet("/me/access", accessResponseContract),
      };
    } catch (error: unknown) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isTransientAccessFailure(error)) {
        return { ok: false, error };
      }
      await wait(delay);
    }
  }
}

export const getServerAccessResult = cache(async (): Promise<ServerAccessResult> => {
  return resolveServerAccess();
});

export async function getServerAccess(): Promise<AccessResponse> {
  const result = await getServerAccessResult();
  return result.ok ? result.access : DENIED;
}
