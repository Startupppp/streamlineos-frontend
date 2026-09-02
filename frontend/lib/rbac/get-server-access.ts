import "server-only";

import { cache } from "react";
import { serverGet } from "@/lib/server-fetch";
import {
  accessResponseContract,
  type AccessResponse,
} from "@/hooks/api/access-schema";

const DENIED: AccessResponse = {
  scopes: {},
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: {},
  mfa: { enforced: false, satisfied: true },
};

export type ServerAccessResult =
  | { ok: true; access: AccessResponse }
  | { ok: false };

export const getServerAccessResult = cache(async (): Promise<ServerAccessResult> => {
  try {
    return { ok: true, access: await serverGet("/me/access", accessResponseContract) };
  } catch {
    return { ok: false };
  }
});

export async function getServerAccess(): Promise<AccessResponse> {
  const result = await getServerAccessResult();
  return result.ok ? result.access : DENIED;
}
