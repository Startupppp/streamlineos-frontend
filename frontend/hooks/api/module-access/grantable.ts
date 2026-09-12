"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { useCan } from "@/hooks/api/access";
import { viewKey } from "./types";
import type { ModuleGrantable } from "./module-access-schema";
import { lazyContract } from "@/lib/api-envelope";

/** Deferred — see `catalog.ts`; the contract itself is unchanged. */
const grantableContract = lazyContract(() =>
  import("./module-access-schema").then((m) => m.moduleGrantableContract),
);

/**
 * What the CALLER may grant inside one module.
 *
 * `describeGrantable` narrows its answer to the caller's own authority, so the
 * UI can offer exactly the options a grant would survive rather than rendering
 * a control the backend will refuse. The route is authorized in service
 * (`assertModuleAccessPolicy` at the `view` rung), which is the same standing
 * `viewKey` mirrors, so the gate here matches the one the API applies.
 */
export function useModuleGrantable(moduleKey: string | undefined) {
  const canView = useCan(viewKey(moduleKey ?? ""));
  return useQuery<ModuleGrantable, Error>({
    queryKey: directoryAndOwnershipQueryKeys.moduleAccess.grantable(
      moduleKey ?? "",
    ),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/module-access/${moduleKey}/standing/grantable`,
        undefined,
        signal,
        grantableContract,
      ),
    enabled: !!moduleKey && canView,
    staleTime: 2 * 60_000,
  });
}
