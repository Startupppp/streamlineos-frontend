"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { useCan } from "@/hooks/api/access";
import { viewKey } from "./types";
import type { ModuleGrantable } from "./module-access-schema";
import { lazyContract } from "@/lib/api-envelope";

const grantableContract = lazyContract(() =>
  import("./module-access-schema").then((m) => m.moduleGrantableContract),
);

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
