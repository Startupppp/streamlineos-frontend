"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const kpiDeleteC = lazyContract(() =>
  import("@/hooks/api/hr/kpis-schema").then((m) => m.kpiDeleteContract),
);

export interface KpiDefinition {
  id: number;
  orgId: string;
  name: string;
  description?: string;
  category: string;
  unit?: string;
  target?: string;
  weight: string;
  isActive: boolean;
  createdAt: string;
}

export interface CompetencyFramework {
  id: number;
  orgId: string;
  name: string;
  description?: string;
  ratingScale: number;
  levels: { level: number; label: string; description: string }[];
  isActive: boolean;
  createdAt: string;
  competencies?: Competency[];
}

export interface Competency {
  id: number;
  frameworkId: number;
  name: string;
  description?: string;
  category: string;
  weight: string;
  createdAt: string;
}

export function useKpis() {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.kpis(),
    queryFn: ({ signal }) => apiClient.get<KpiDefinition[]>("/hr/kpis", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateKpi() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "kpis", "create"],
    mutationFn: (data: Omit<KpiDefinition, "id" | "orgId" | "isActive" | "createdAt">) =>
      apiClient.post<KpiDefinition>("/hr/kpis", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.kpis() }),
  });
}

export function useUpdateKpi() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "kpis", "update"],
    mutationFn: ({ id, ...data }: Partial<KpiDefinition> & { id: number }) =>
      apiClient.patch<KpiDefinition>(`/hr/kpis/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.kpis() }),
  });
}

export function useDeleteKpi() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "kpis", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/kpis/${id}`, undefined, undefined, kpiDeleteC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.kpis() }),
  });
}

export function useCompetencyFrameworks() {
  const canView = useCan("hr:performance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.competencyFrameworks(),
    queryFn: ({ signal }) => apiClient.get<CompetencyFramework[]>("/hr/kpis/frameworks", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canView && hrEnabled,
  });
}

export function useCreateCompetencyFramework() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "frameworks", "create"],
    mutationFn: (
      data: Omit<
        CompetencyFramework,
        "id" | "orgId" | "isActive" | "createdAt" | "competencies"
      >,
    ) => apiClient.post<CompetencyFramework>("/hr/kpis/frameworks", data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.competencyFrameworks() }),
  });
}

export function useCreateCompetency() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "competencies", "create"],
    mutationFn: ({
      frameworkId,
      ...data
    }: Omit<Competency, "id" | "createdAt"> & { frameworkId: number }) =>
      apiClient.post<Competency>(
        `/hr/kpis/frameworks/${frameworkId}/competencies`,
        data,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.competencyFrameworks() }),
  });
}
