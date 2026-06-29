"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface OrgModule {
  id: string;
  orgId: string;
  moduleKey: string;
  enabled: boolean;
  enabledAt: string;
  enabledBy: string | null;
}

export function useOrgModules() {
  return useQuery<OrgModule[], Error>({
    queryKey: queryKeys.access.orgModules(),
    queryFn: () => apiClient.get<OrgModule[]>("/access/org-modules"),
    staleTime: 60_000,
  });
}

export function useToggleOrgModule() {
  const qc = useQueryClient();
  return useMutation<OrgModule, Error, { moduleKey: string; enabled: boolean }>({
    mutationFn: ({ moduleKey, enabled }) =>
      apiClient.patch<OrgModule>(`/access/org-modules/${moduleKey}`, { enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.access.orgModules() });
      qc.invalidateQueries({ queryKey: queryKeys.access.me() });
    },
  });
}
