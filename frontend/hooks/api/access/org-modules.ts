"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAccess, useCan } from "@/hooks/api/access";
import { ORG_MODULE_NAME, normalizeOrgModuleKey } from "@/lib/module-vocabulary";
import type { AccessResponse } from "@/types/access";

export interface OrgModule {
  moduleKey: string;
  enabled: boolean;
  core?: boolean;
}

const EMPTY_MODULES: string[] = [];

function isOrgModule(value: unknown): value is OrgModule {
  if (value === null || typeof value !== "object") return false;

  const moduleRecord = value as Record<string, unknown>;
  return (
    typeof moduleRecord.moduleKey === "string" &&
    moduleRecord.moduleKey.trim().length > 0 &&
    typeof moduleRecord.enabled === "boolean" &&
    (moduleRecord.core === undefined || typeof moduleRecord.core === "boolean")
  );
}

/**
 * Keep the page insulated from response-envelope differences between API
 * deployments. The query cache itself is normalized, so optimistic updates
 * can always work with an array as well.
 */
export function normalizeOrgModulesResponse(response: unknown): OrgModule[] {
  let candidate = response;

  for (let depth = 0; depth < 3; depth += 1) {
    if (Array.isArray(candidate)) {
      if (candidate.every(isOrgModule)) return candidate;
      break;
    }

    if (candidate === null || typeof candidate !== "object") break;

    const envelope = candidate as Record<string, unknown>;
    if ("data" in envelope) {
      candidate = envelope.data;
      continue;
    }
    if ("modules" in envelope) {
      candidate = envelope.modules;
      continue;
    }
    break;
  }

  throw new Error(
    "The server returned an invalid module configuration. Please try again.",
  );
}

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
    queryFn: async () =>
      normalizeOrgModulesResponse(
        await apiClient.get<unknown>("/access/org-modules"),
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
      const previousValue = qc.getQueryData<unknown>(
        queryKeys.access.orgModules(),
      );
      const previousModules =
        previousValue === undefined
          ? undefined
          : normalizeOrgModulesResponse(previousValue);
      const previousAccess = qc.getQueriesData<AccessResponse>({
        queryKey: queryKeys.access.all,
      });

      qc.setQueryData<OrgModule[]>(
        queryKeys.access.orgModules(),
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
