"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { ModuleOwnership } from "./types";
import { viewKey } from "./types";
import { lazyContract } from "@/lib/api-envelope";

/** Deferred — see `catalog.ts`; the contract itself is unchanged. */
const ownershipContract = lazyContract(() =>
  import("./module-access-schema").then((m) => m.moduleOwnershipContract),
);

export function useModuleOwnership(moduleKey: string) {
  const canView = useCan(viewKey(moduleKey));
  return useQuery<ModuleOwnership, Error>({
    queryKey: queryKeys.moduleAccess.ownership(moduleKey),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/module-access/${moduleKey}/ownership`,
        undefined,
        signal,
        ownershipContract,
      ),
    enabled: canView,
    staleTime: 2 * 60_000,
  });
}

export function useTransferModuleOwnership(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, { toUserId: string }>({
    mutationKey: ["moduleAccess", moduleKey, "transfer-ownership"],
    mutationFn: (body) =>
      apiClient.post<{ success: true }>(
        `/module-access/${moduleKey}/ownership/transfer`,
        body,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.ownership(moduleKey),
      });
    },
  });
}

export function useCancelModuleOwnershipTransfer(moduleKey: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: true }, Error, void>({
    mutationKey: ["moduleAccess", moduleKey, "cancel-transfer"],
    mutationFn: () =>
      apiClient.delete<{ success: true }>(
        `/module-access/${moduleKey}/ownership/transfer`,
        undefined,
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.moduleAccess.ownership(moduleKey),
      });
    },
  });
}
