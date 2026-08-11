"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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
  const canView = useCan("crm:data-quality:view");
  return useQuery({
    queryKey: queryKeys.crmDataQuality.report(),
    queryFn: () => apiClient.get<DataQualityReport>("/crm/data-quality"),
    staleTime: 60_000,
    enabled: canView,
  });
}
