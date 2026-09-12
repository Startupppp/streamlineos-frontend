"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { coverageOf, num, toCoverage } from "./projects-types";
import type {
  AtRiskRequirement,
  ProjectDetail,
  ProjectListItem,
  ProjectRequirement,
  ProjectStatus,
  RawAtRiskRequirement,
  RawCoverage,
} from "./projects-types";

export interface ProjectFilters {
  [key: string]: unknown;
  status?: ProjectStatus;
  zone?: string;
  search?: string;
  openOnly?: boolean;
  page?: number;
  limit?: number;
}

export function useProjects(filters?: ProjectFilters) {
  const canView = useCan("inventory:projects:read");
  return useQuery<{ items: ProjectListItem[]; total: number; page: number; totalPages: number }, Error>({
    queryKey: queryKeys.inventoryProjects.list(filters),
    queryFn: ({ signal }) => {
      const params: Record<string, string | undefined> = {};
      if (filters?.status) params.status = filters.status;
      if (filters?.zone) params.zone = filters.zone;
      if (filters?.search) params.search = filters.search;
      if (filters?.openOnly) params.openOnly = "true";
      if (filters?.page) params.page = String(filters.page);
      if (filters?.limit) params.limit = String(filters.limit);
      return apiClient.get<{ items: ProjectListItem[]; total: number; page: number; totalPages: number }>(
        "/inventory/projects",
        params,
        signal,
      );
    },
    // Keeping the previous page on screen while the next loads is what stops a
    // filter change flashing an empty table at somebody mid-scan.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useProject(projectId: number) {
  const canView = useCan("inventory:projects:read");
  return useQuery<ProjectDetail | null, Error>({
    queryKey: queryKeys.inventoryProjects.detail(projectId),
    queryFn: async ({ signal }) => {
      const r = await apiClient.get<(Omit<ProjectDetail, "requirements"> & {
        requirements: (Omit<ProjectRequirement, "requiredQty" | "fulfilledQty" | "coverage"> & {
          requiredQty: string; fulfilledQty: string; coverage: RawCoverage | null;
        })[];
      }) | null>(`/inventory/projects/${projectId}`, undefined, signal);
      if (!r) return null;
      return {
        ...r,
        requirements: r.requirements.map((q) => ({
          ...q,
          requiredQty: num(q.requiredQty),
          fulfilledQty: num(q.fulfilledQty),
          coverage: toCoverage(q.coverage),
        })),
      };
    },
    staleTime: 30_000,
    enabled: canView && projectId > 0,
  });
}

export function useAtRiskRequirements(limit = 25) {
  const canView = useCan("inventory:projects:read");
  return useQuery<AtRiskRequirement[], Error>({
    queryKey: queryKeys.inventoryProjects.atRisk,
    queryFn: async ({ signal }) => {
      const rows = await apiClient.get<RawAtRiskRequirement[]>(
        "/inventory/projects/at-risk",
        { limit: String(limit) },
        signal,
      );
      return rows.map((r) => ({
        ...coverageOf(r.coverage),
        id: Number(r.id),
        projectId: Number(r.projectId),
        projectCode: r.projectCode ?? "",
        projectName: r.projectName ?? "",
        projectZone: r.projectZone,
        productName: r.productName ?? "",
        variantSku: r.variantSku ?? "",
        requiredBy: r.requiredBy,
        status: r.status,
      }));
    },
    staleTime: 60_000,
    enabled: canView,
  });
}
