"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  DataQualityFindingsPage,
  DataQualityResolveResult,
} from "@/hooks/api/crm/data-quality-findings-schema";

const findingsPageLazy = lazyContract(() =>
  import("@/hooks/api/crm/data-quality-findings-schema").then((m) => m.dataQualityFindingsPageContract),
);
const resolveResultLazy = lazyContract(() =>
  import("@/hooks/api/crm/data-quality-findings-schema").then((m) => m.dataQualityResolveResultContract),
);

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
      qc.setQueriesData<DataQualityFindingsPage>(
        { queryKey: growthAndSignQueryKeys.crmDataQuality.findings() },
        (page) =>
          page ? { ...page, data: page.data.filter((f) => !closed.has(f.findingId)) } : page,
      );
      void qc.invalidateQueries({
        queryKey: growthAndSignQueryKeys.crmDataQuality.findings(),
        refetchType: "none",
      });
    },
  });
}
