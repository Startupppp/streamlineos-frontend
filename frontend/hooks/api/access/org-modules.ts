"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAccess, useCan } from "@/hooks/api/access";
import { ORG_MODULE_NAME, normalizeOrgModuleKey } from "@/lib/module-vocabulary";
import type { AccessResponse } from "@/types/access";

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
  return useMutation<
    void,
    Error,
    { moduleKey: string; enabled: boolean },
    { previousModules?: OrgModule[]; previousAccess: [readonly unknown[], AccessResponse | undefined][] }
  >({
    mutationKey: ["toggle", "org", "module"],
    mutationFn: ({ moduleKey, enabled }) =>
      apiClient.patch<void>(`/access/org-modules/${moduleKey}`, { enabled }),
    onMutate: async ({ moduleKey, enabled }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: queryKeys.access.orgModules() }),
        qc.cancelQueries({ queryKey: queryKeys.access.all }),
      ]);
      const previousModules = qc.getQueryData<OrgModule[]>(
        queryKeys.access.orgModules(),
      );
      const previousAccess = qc.getQueriesData<AccessResponse>({
        queryKey: queryKeys.access.all,
      });

      qc.setQueryData<OrgModule[]>(queryKeys.access.orgModules(), (current) =>
        current?.map((module) =>
          module.moduleKey === moduleKey ? { ...module, enabled } : module,
        ),
      );
      const canonicalKey = normalizeOrgModuleKey(moduleKey);
      for (const [queryKey] of previousAccess) {
        qc.setQueryData<AccessResponse>(queryKey, (current) =>
          current
            ? {
                ...current,
                modules: { ...current.modules, [canonicalKey]: enabled },
              }
            : current,
        );
      }

      return { previousModules, previousAccess };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousModules) {
        qc.setQueryData(queryKeys.access.orgModules(), context.previousModules);
      }
      for (const [queryKey, data] of context?.previousAccess ?? []) {
        qc.setQueryData(queryKey, data);
      }
    },
    onSuccess: () => {
      clearBackendTokenCache();
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.access.orgModules() });
      void qc.invalidateQueries({ queryKey: queryKeys.access.all });
    },
  });
}
