"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAccess, useCan } from "@/hooks/api/access";
import { ORG_MODULE_NAME } from "@/lib/module-vocabulary";

interface OrgModule {
  moduleKey: string;
  enabled: boolean;
  core?: boolean;
}

const EMPTY_MODULES: string[] = [];

export function useEnabledModules(): string[] {
  const { data } = useAccess();

  return useMemo(() => {
    if (!data?.modules) {
      return EMPTY_MODULES;
    }

    return Object.entries(ORG_MODULE_NAME)
      .filter(([key]) => data.modules[key])
      .map(([, name]) => name);
  }, [data?.modules]);
}

export function useOrgModules() {
  const canManage = useCan("settings:manage");
  return useQuery<OrgModule[], Error>({
    queryKey: queryKeys.access.orgModules(),
    queryFn: () => apiClient.get<OrgModule[]>("/access/org-modules"),
    staleTime: 60_000,
    enabled: canManage,
  });
}

export function useToggleOrgModule() {
  const qc = useQueryClient();
  const { update } = useSession();
  return useMutation<void, Error, { moduleKey: string; enabled: boolean }>({
    mutationKey: ["toggle", "org", "module"],
    mutationFn: ({ moduleKey, enabled }) =>
      apiClient.patch<void>(`/access/org-modules/${moduleKey}`, { enabled }),
    onSuccess: () => {
      clearBackendTokenCache();
      qc.invalidateQueries({ queryKey: queryKeys.access.orgModules() });
      qc.invalidateQueries({ queryKey: queryKeys.access.me() });
      void update();
    },
  });
}
