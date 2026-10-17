"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  DataQualityFindingsPage,
  DataQualityMergePreview,
  DataQualityResolveResult,
  DataQualityReverseResult,
} from "@/hooks/api/crm/data-quality-findings-schema";

const findingsPageLazy = lazyContract(() =>
  import("@/hooks/api/crm/data-quality-findings-schema").then((m) => m.dataQualityFindingsPageContract),
);
const resolveResultLazy = lazyContract(() =>
  import("@/hooks/api/crm/data-quality-findings-schema").then((m) => m.dataQualityResolveResultContract),
);
const mergePreviewLazy = lazyContract(() =>
  import("@/hooks/api/crm/data-quality-findings-schema").then((m) => m.dataQualityMergePreviewContract),
);
const reverseResultLazy = lazyContract(() =>
  import("@/hooks/api/crm/data-quality-findings-schema").then((m) => m.dataQualityReverseResultContract),
);

/** The `GET /crm/data-quality/findings` query contract (`listFindingsQuerySchema`). */
export interface DataQualityFindingFilters {
  status?: "open" | "resolved" | "dismissed";
  producer?: "duplicate" | "contradiction" | "reachability" | "staleness" | "import-uncertainty";
  severity?: "high" | "medium" | "low";
  order?: "oldest" | "newest";
  limit?: number;
  cursor?: string;
}

export function useDataQualityFindings(filters: DataQualityFindingFilters) {
  return useGatedQuery("crm:data-quality:view", {
    queryKey: growthAndSignQueryKeys.crmDataQuality.findings({ ...filters }),
    queryFn: ({ signal }) =>
      apiClient.get<DataQualityFindingsPage>(
        "/crm/data-quality/findings",
        { ...filters },
        signal,
        findingsPageLazy,
      ),
    staleTime: 30_000,
  });
}

/**
 * What applying one `merge-parties` finding would do: which record survives,
 * what it inherits, what it keeps over the other, and anything that would make
 * the apply refuse. Read only while the merge confirm is open.
 */
export function useDataQualityMergePreview(findingId: string | null) {
  return useGatedQuery("crm:data-quality:view", {
    queryKey: growthAndSignQueryKeys.crmDataQuality.mergePreview(findingId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get<DataQualityMergePreview>(
        `/crm/data-quality/findings/${findingId}/merge-preview`,
        undefined,
        signal,
        mergePreviewLazy,
      ),
    enabled: !!findingId,
    staleTime: 15_000,
  });
}

/**
 * Resolve or dismiss findings picked by id.
 *
 * Only the `ids` selection is offered, so every merge is one the person
 * previewed. `apply` on a finding that proposes `none` only closes the finding;
 * on a `merge-parties` finding it merges the two parties.
 */
export interface ResolveDataQualityFindingsInput {
  findingIds: string[];
  action: "apply" | "dismiss";
  reason?: string;
}

export function useResolveDataQualityFindings() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:data-quality:resolve", {
    mutationKey: ["crm", "data-quality", "resolve"] as const,
    mutationFn: ({ findingIds, action, reason }: ResolveDataQualityFindingsInput) =>
      apiClient.post<DataQualityResolveResult>(
        "/crm/data-quality/resolve",
        {
          selection: { kind: "ids", findingIds },
          action,
          ...(reason ? { reason } : {}),
          expectedCount: findingIds.length,
        },
        undefined,
        resolveResultLazy,
      ),
    onSuccess: (result, vars) => {
      const failed = new Set(result.failures.map((f) => f.findingId));
      const closed = new Set(vars.findingIds.filter((id) => !failed.has(id)));
      // A closed finding has left the open queue; drop it from every cached page.
      qc.setQueriesData<DataQualityFindingsPage>(
        { queryKey: growthAndSignQueryKeys.crmDataQuality.findings() },
        (page) =>
          page ? { ...page, data: page.data.filter((f) => !closed.has(f.findingId)) } : page,
      );
      // The resolved/dismissed views gain rows the client cannot build; mark them stale only.
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.crmDataQuality.findings(),
        refetchType: "none",
      });
    },
  });
}

/**
 * Undo one decision. The backend refuses what its reversibility class forbids;
 * a merge is reverted from its snapshot, and a finding whose merge could not be
 * reverted stays closed and comes back in `failures`.
 */
export function useReverseDataQualityResolution() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:data-quality:resolve", {
    mutationKey: ["crm", "data-quality", "reverse"] as const,
    mutationFn: ({ resolutionId, reason }: { resolutionId: string; reason?: string }) =>
      apiClient.post<DataQualityReverseResult>(
        `/crm/data-quality/resolutions/${resolutionId}/reverse`,
        reason ? { reason } : {},
        undefined,
        reverseResultLazy,
      ),
    onSuccess: (result, vars) => {
      const failed = new Set(result.failures.map((f) => f.findingId));
      // Reopened findings leave the resolved/dismissed views; the open view gains
      // rows in an order only the server knows, so it is only marked stale.
      qc.setQueriesData<DataQualityFindingsPage>(
        { queryKey: growthAndSignQueryKeys.crmDataQuality.findings() },
        (page) =>
          page
            ? {
                ...page,
                data: page.data.filter(
                  (f) => f.status === "open" || f.resolutionId !== vars.resolutionId || failed.has(f.findingId),
                ),
              }
            : page,
      );
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.crmDataQuality.findings(),
        refetchType: "none",
      });
    },
  });
}
