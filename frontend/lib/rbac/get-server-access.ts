import "server-only";

import { cache } from "react";
import { serverFetch } from "@/lib/server-fetch";
import type { AccessResponse } from "@/types/access";

const DENIED: AccessResponse = {
  scopes: {},
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: {},
  mfa: { enforced: false, satisfied: true },
};

function asAccessResponse(payload: unknown): AccessResponse | null {
  if (payload === null || typeof payload !== "object") return null;
  const snapshot = payload as Record<string, unknown>;
  if (typeof snapshot.scopes !== "object" || snapshot.scopes === null) return null;
  return snapshot as unknown as AccessResponse;
}

export const getServerAccess = cache(async (): Promise<AccessResponse> => {
  try {
    return asAccessResponse(await serverFetch<unknown>("/me/access")) ?? DENIED;
  } catch {
    return DENIED;
  }
});
