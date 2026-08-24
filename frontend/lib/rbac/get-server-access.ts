import "server-only";

import { cache } from "react";
import { serverGet } from "@/lib/server-fetch";
import type { AccessResponse } from "@/types/access";

const DENIED: AccessResponse = {
  scopes: {},
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: {},
  mfa: { enforced: false, satisfied: true },
};

export const getServerAccess = cache(async (): Promise<AccessResponse> => {
  try {
    return await serverGet<AccessResponse>("/me/access");
  } catch {
    return DENIED;
  }
});
