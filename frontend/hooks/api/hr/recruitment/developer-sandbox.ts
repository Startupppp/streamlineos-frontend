"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type {
  DirectorySyncEntry,
  SandboxCatalogue,
  SandboxDelivery,
} from "@/hooks/api/hr/recruitment/developer-sandbox-schema";

export type { DirectorySyncEntry, SandboxCatalogue, SandboxDelivery };

const catalogueContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/developer-sandbox-schema").then(
    (m) => m.sandboxCatalogueSchema,
  ),
);
const directoryContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/developer-sandbox-schema").then((m) => m.directorySyncSchema),
);
const deliveriesContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/developer-sandbox-schema").then(
    (m) => m.sandboxDeliveryListSchema,
  ),
);
const replayContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/developer-sandbox-schema").then(
    (m) => m.sandboxReplayResultSchema,
  ),
);

const SANDBOX_PERMISSION = "hr:integrations:manage";

export function useSandboxCatalogue() {
  return useGatedQuery(SANDBOX_PERMISSION, {
    queryKey: humanResourcesQueryKeys.hr.atsSandboxEvents,
    queryFn: ({ signal }) =>
      apiClient.get<SandboxCatalogue>(
        "/hr/recruitment/developer/events",
        undefined,
        signal,
        catalogueContract,
      ),
    /* A published constant. It changes when this deployment changes, not sooner. */
    staleTime: 60 * 60_000,
  });
}

export function useDirectorySyncState() {
  return useGatedQuery(SANDBOX_PERMISSION, {
    queryKey: humanResourcesQueryKeys.hr.atsDirectorySync,
    queryFn: ({ signal }) =>
      apiClient.get<DirectorySyncEntry[]>(
        "/hr/recruitment/developer/directory-sync",
        undefined,
        signal,
        directoryContract,
      ),
    staleTime: 60 * 60_000,
  });
}

export function useSandboxDeliveries() {
  return useGatedQuery(SANDBOX_PERMISSION, {
    queryKey: humanResourcesQueryKeys.hr.atsSandboxDeliveries,
    queryFn: ({ signal }) =>
      apiClient.get<SandboxDelivery[]>(
        "/hr/recruitment/developer/deliveries",
        { limit: 50 },
        signal,
        deliveriesContract,
      ),
    /*
      Short, because the point of this list is watching a replay land. A
      developer staring at a stale "pending" concludes the delivery hung.
    */
    staleTime: 5_000,
  });
}

export interface ReplayRequest {
  subscriptionId: number;
  event: string;
}

export function useReplaySandboxEvent() {
  const qc = useQueryClient();
  return useAuthorizedMutation(SANDBOX_PERMISSION, {
    mutationKey: humanResourcesQueryKeys.hr.atsSandboxReplay,
    mutationFn: ({ subscriptionId, event }: ReplayRequest) =>
      apiClient.post(
        `/hr/recruitment/developer/subscriptions/${subscriptionId}/replay`,
        { event },
        undefined,
        replayContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.atsSandboxDeliveries });
    },
  });
}
