"use client";

import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
const effectiveRulesContract = lazyContract(() =>
  import("@/hooks/api/hr/settings-hub-schema").then((m) => m.effectiveRulesContract),
);
const versionsContract = lazyContract(() =>
  import("@/hooks/api/hr/settings-hub-schema").then((m) => m.versionsContract),
);

export type { EffectiveRuleItem, VersionsResponse } from "@/hooks/api/hr/settings-hub-schema";

export type VersionEntity = "policy" | "template" | "workflow";

export function useEffectiveRules(params: { employeeId: string; date: string } | null) {
  return useGatedQuery("hr:policies:view", {
    queryKey: humanResourcesQueryKeys.hr.settingsHubRules(params),
    queryFn: ({ signal }) => {
      if (!params) throw new Error("useEffectiveRules ran without an employee and date");
      const qs = new URLSearchParams({
        employeeId: params.employeeId,
        date: params.date,
      });
      return apiClient.get(`/hr/settings-hub/effective-rules?${qs}`, undefined, signal, effectiveRulesContract);
    },
    staleTime: 30_000,
    enabled: !!params?.employeeId && !!params?.date,
  });
}

export function useEntityVersions(entity: VersionEntity, id: number | null) {
  return useGatedQuery("hr:policies:view", {
    queryKey: humanResourcesQueryKeys.hr.settingsHubVersions(entity, id),
    queryFn: ({ signal }) => {
      const qs = new URLSearchParams({ entity, id: String(id) });
      return apiClient.get(`/hr/settings-hub/versions?${qs}`, undefined, signal, versionsContract);
    },
    staleTime: 60_000,
    enabled: id !== null && id > 0,
  });
}
