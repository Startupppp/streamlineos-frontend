"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useAccess, useCan } from "@/hooks/api/access";
import { ORG_MODULE_NAME, normalizeOrgModuleKey } from "@/lib/org-module-keys";
import type { AccessResponse } from "@/types/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import {
  normalizeOrgModulesResponse,
  type OrgModule,
} from "@/hooks/api/access/org-modules-normalize";

/** Deferred so the sidebar, which imports this module, does not carry Zod. */
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const orgModulesContract = lazyContract(() =>
  import("@/hooks/api/access/module-status-schema").then(
    (m) => m.orgModuleStatusesContract,
  ),
);

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
    queryKey: platformCoreQueryKeys.access.orgModules(),
    queryFn: async ({ signal }) =>
      normalizeOrgModulesResponse(
        await apiClient.get("/access/org-modules", undefined, signal, orgModulesContract),
      ),
    // Also protects an in-memory query cache created by an older hot-reloaded
    // bundle that stored the response envelope instead of the list.
    select: normalizeOrgModulesResponse,
    staleTime: 60_000,
    enabled: canManage,
  });
}

export function useToggleOrgModule() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    void,
    Error,
    { moduleKey: string; enabled: boolean },
    { previousModules?: OrgModule[]; previousAccess: [readonly unknown[], AccessResponse | undefined][] }
  >("settings:manage", {
    mutationKey: ["toggle", "org", "module"],
    mutationFn: ({ moduleKey, enabled }) =>
      apiClient.patch<void>(`/access/org-modules/${moduleKey}`, { enabled }, undefined, noContentContract),
    onMutate: async ({ moduleKey, enabled }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: platformCoreQueryKeys.access.orgModules() }),
        qc.cancelQueries({ queryKey: platformCoreQueryKeys.access.all }),
      ]);
      const previousValue = qc.getQueryData<unknown>(
        platformCoreQueryKeys.access.orgModules(),
      );
      const previousModules =
        previousValue === undefined
          ? undefined
          : normalizeOrgModulesResponse(previousValue);
      const previousAccess = qc.getQueriesData<AccessResponse>({
        queryKey: platformCoreQueryKeys.access.all,
      });

      qc.setQueryData<OrgModule[]>(
        platformCoreQueryKeys.access.orgModules(),
        previousModules?.map((module) =>
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
        qc.setQueryData(platformCoreQueryKeys.access.orgModules(), context.previousModules);
      }
      for (const [queryKey, data] of context?.previousAccess ?? []) {
        qc.setQueryData(queryKey, data);
      }
    },
    onSuccess: () => {
      clearBackendTokenCache();
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.access.orgModules() });
      void qc.invalidateQueries({ queryKey: platformCoreQueryKeys.access.all });
    },
  });
}
