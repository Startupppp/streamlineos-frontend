"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface EffectiveRuleItem {
  policyType: string;
  matchedPolicy: {
    id: number;
    name: string;
    policyType: string;
    version: number;
    status: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    priority: number;
    rules: Record<string, unknown>;
  };
  rules: Record<string, unknown>;
  trace: {
    policyId: number;
    policyName: string;
    version: number;
    matchedScopes: Array<{ scopeType: string; scopeValue: string; specificity: number }>;
    maxSpecificity: number;
    priority: number;
  };
}

export type VersionEntity = "policy" | "template" | "workflow";

export interface VersionItem {
  id: number;
  name: string;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface VersionsResponse {
  entity: VersionEntity;
  name: string;
  items: VersionItem[];
}

export function useEffectiveRules(params: { employeeId: string; date: string } | null) {
  return useQuery({
    queryKey: queryKeys.hr.settingsHubRules(params),
    queryFn: () => {
      const qs = new URLSearchParams({
        employeeId: params!.employeeId,
        date: params!.date,
      });
      return apiClient.get<EffectiveRuleItem[]>(`/hr/settings-hub/effective-rules?${qs}`);
    },
    staleTime: 30_000,
    enabled: !!params?.employeeId && !!params?.date,
  });
}

export function useEntityVersions(entity: VersionEntity, id: number | null) {
  return useQuery({
    queryKey: queryKeys.hr.settingsHubVersions(entity, id),
    queryFn: () => {
      const qs = new URLSearchParams({ entity, id: String(id) });
      return apiClient.get<VersionsResponse>(`/hr/settings-hub/versions?${qs}`);
    },
    staleTime: 60_000,
    enabled: id !== null && id > 0,
  });
}
