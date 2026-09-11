"use client";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { lazyContract } from "@/lib/api-envelope";

const dataQualityReportLazy = lazyContract(() =>
  import("@/hooks/api/crm/data-quality-schema").then((m) => m.dataQualityReportContract),
);

export interface DataQualityOffender {
  id: number | string;
  name: string;
  detail?: string;
}

export interface DataQualityAggregate {
  count: number;
  offenders: DataQualityOffender[];
}

export interface DataQualityReport {
  leadsWithoutEmail: DataQualityAggregate;
  leadsWithInvalidPhone: DataQualityAggregate;
  duplicateLeads: DataQualityAggregate;
  duplicateCompanies: DataQualityAggregate;
  staleDeals: DataQualityAggregate;
  dealsWithNoNextActivity: DataQualityAggregate;
  leadsWithNoOwner: DataQualityAggregate;
  dealsMissingStageFields: DataQualityAggregate;
}

export function useCrmDataQuality() {
  return useGatedQuery("crm:data-quality:view", {
    queryKey: queryKeys.crmDataQuality.report(),
    queryFn: ({ signal }) => apiClient.get<DataQualityReport>("/crm/data-quality", undefined, signal, dataQualityReportLazy),
    staleTime: 60_000,
  });
}
