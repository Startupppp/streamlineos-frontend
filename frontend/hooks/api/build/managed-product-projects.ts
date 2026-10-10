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
  contribution: z.object({
    totalTickets: z.number().int(),
    doneTickets: z.number().int(),
    percent: z.number().nullable(),
  }),
  linkedRoadmapItemCount: z.number().int(),
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
  status?: string;
  ownerId?: number;
  managerId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

function toQueryParams(
  params: ManagedProductProjectsParams,
): Record<string, unknown> {
  const { managedProductId: _id, ...rest } = params;
  return Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined && v !== ""),
  );
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
