"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAccess } from "@/hooks/api/access";

interface OrgModule {
  moduleKey: string;
  enabled: boolean;
  core?: boolean;
}

const BACKEND_MODULE_NAMES: Record<string, string> = {
  hr: "HR",
  crm: "CRM",
  projects: "PROJECTS",
  accounting: "FINANCE",
  inventory: "INVENTORY",
  support: "HELPDESK",
  kb: "KB",
  surveys: "SURVEYS",
  payroll: "PAYROLL",
  sign: "SIGN",
};

const EMPTY_MODULES: string[] = [];

export function useEnabledModules(): string[] {
  const { data: session } = useSession();
  const { data } = useAccess();

  return useMemo(() => {
    if (!data?.modules) {
      return session?.enabledModules ?? EMPTY_MODULES;
    }

    return Object.entries(BACKEND_MODULE_NAMES)
      .filter(([key]) => data.modules[key])
      .map(([, name]) => name);
  }, [data?.modules, session?.enabledModules]);
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
  const { update } = useSession();
  return useMutation<void, Error, { moduleKey: string; enabled: boolean }>({
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
