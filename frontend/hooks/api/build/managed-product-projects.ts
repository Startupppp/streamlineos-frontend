"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const linkedProjectRowContract = z.object({
  id: z.number().int(),
  name: z.string(),
  key: z.string(),
  status: z.string(),
  isPrimary: z.boolean().catch(false),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable().catch(null),
  ownerId: z.string().nullable(),
  ownerMembershipId: z.number().int().nullable(),
  managerMembershipId: z.number().int().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  nextMilestone: z
    .object({
      id: z.number().int(),
      name: z.string(),
      targetDate: z.string(),
    })
    .nullable(),
  nextRelease: z
    .object({
      id: z.number().int(),
      name: z.string(),
      version: z.string(),
      releaseDate: z.string().nullable(),
    })
    .nullable()
    .catch(null),
  linkedGoals: z
    .array(
      z.object({
        id: z.number().int(),
        title: z.string(),
        status: z.string(),
      }),
    )
    .catch([]),
  contribution: z.object({
    totalTickets: z.number().int(),
    doneTickets: z.number().int(),
    percent: z.number().nullable(),
  }),
  linkedRoadmapItemCount: z.number().int(),
  revision: z.number().int().catch(0),
  sourceFreshness: z.string().catch(""),
  allowedActions: z.array(z.string()).catch([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const linkedProjectsPageContract = z.object({
  data: z.array(linkedProjectRowContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export type LinkedProjectRow = z.infer<typeof linkedProjectRowContract>;
export type LinkedProjectsPage = z.infer<typeof linkedProjectsPageContract>;

const linkedProjectsC = lazyContract(
  () =>
    Promise.resolve(linkedProjectsPageContract),
);

export interface ManagedProductProjectsParams {
  managedProductId: number;
  cursor?: string;
  limit?: number;
  status?: string[];
  health?: string[];
  ownerId?: number[];
  managerId?: number;
  teamId?: number;
  clientId?: number;
  minContribution?: number;
  maxContribution?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

function toQueryParams(
  params: ManagedProductProjectsParams,
): Record<string, unknown> {
  const { managedProductId: _id, status, health, ownerId, ...rest } = params;
  const result: Record<string, unknown> = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined && v !== ""),
  );
  if (status && status.length > 0) result["status"] = status.join(",");
  if (health && health.length > 0) result["health"] = health.join(",");
  if (ownerId && ownerId.length > 0) result["ownerId"] = ownerId.join(",");
  return result;
}

const projectLinkedProductRowContract = z.object({
  managedProductId: z.number().int(),
  name: z.string(),
  key: z.string(),
  status: z.string(),
  isPrimary: z.boolean(),
});
const projectLinkedProductsListContract = z.object({
  data: z.array(projectLinkedProductRowContract),
});
export type ProjectLinkedProductRow = z.infer<typeof projectLinkedProductRowContract>;

const projectLinkedProductsC = lazyContract(() =>
  Promise.resolve(projectLinkedProductsListContract),
);

export function useProjectLinkedProducts(
  projectId: number,
  options?: { enabled?: boolean },
) {
  return useGatedQuery("build:managed-products:view", {
    queryKey: buildWorkQueryKeys.projects.managedProducts.projectLinkedProducts(projectId),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/build/managed-products/projects/${projectId}/products`,
        {},
        signal,
        projectLinkedProductsC,
      ),
    staleTime: 30_000,
    enabled: options?.enabled,
    ...INLINE_READ_ERROR,
  });
}

export function useManagedProductProjects(params: ManagedProductProjectsParams) {
  const { managedProductId, ...filters } = params;
  const filterKey = Object.keys(filters).length > 0 ? filters : undefined;
  return useGatedQuery("build:managed-products:view", {
    queryKey: buildWorkQueryKeys.projects.managedProducts.linkedProjects(
      managedProductId,
      filterKey,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<LinkedProjectsPage>(
        `/build/managed-products/${managedProductId}/projects`,
        toQueryParams(params),
        signal,
        linkedProjectsC,
      ),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    ...INLINE_READ_ERROR,
  });
}
