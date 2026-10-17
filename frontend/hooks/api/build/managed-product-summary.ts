"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { readErrorExceptNotFoundReachesBoundary } from "@/lib/query-error-policy";
export function compactManagedProductSummarySchema(
  schema: typeof import("@/contracts/build-contracts.generated").managedProductRelationsGetManagedProductSummaryResponseSchema,
) {
  const releasePreviewSchema =
    schema.shape.previews.shape.releases.element.pick({
      id: true,
      orgId: true,
      managedProductId: true,
      name: true,
      version: true,
      description: true,
      status: true,
      releaseDate: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    });
  return schema.extend({
    previews: schema.shape.previews.extend({
      releases: z.array(releasePreviewSchema),
    }),
  });
}
const managedProductSummaryContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) =>
    compactManagedProductSummarySchema(
      m.managedProductRelationsGetManagedProductSummaryResponseSchema,
    ),
  ),
);

export type SummaryPeriod = "30d" | "90d" | "365d" | "all";
export type InitiativeStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface SummaryFilters {
  period?: SummaryPeriod;
  teamId?: number;
  segment?: string;
  initiativeStatus?: InitiativeStatus;
  from?: string;
  to?: string;
}

export type ManagedProductSummary = z.infer<
  ReturnType<typeof compactManagedProductSummarySchema>
>;

export function useManagedProductSummary(
  managedProductId: number,
  filters?: SummaryFilters,
) {
  const canView = useCan("build:managed-products:view");
  const queryParams: Record<string, string> = {};
  if (filters?.period !== undefined) queryParams["period"] = filters.period;
  if (filters?.teamId !== undefined)
    queryParams["teamId"] = String(filters.teamId);
  if (filters?.segment !== undefined) queryParams["segment"] = filters.segment;
  if (filters?.initiativeStatus !== undefined)
    queryParams["initiativeStatus"] = filters.initiativeStatus;
  if (filters?.from !== undefined) queryParams["from"] = filters.from;
  if (filters?.to !== undefined) queryParams["to"] = filters.to;
  const hasParams = Object.keys(queryParams).length > 0;
  const filtersKey: Record<string, string | number | undefined> | undefined =
    hasParams ? queryParams : undefined;
  return useQuery<ManagedProductSummary | null>({
    queryKey: buildWorkQueryKeys.projects.managedProducts.summary(
      managedProductId,
      filtersKey,
    ),
    queryFn: async ({ signal }) => {
      return apiClient.get<ManagedProductSummary>(
        `/build/managed-products/${managedProductId}/summary`,
        hasParams ? queryParams : undefined,
        signal,
        managedProductSummaryContract,
      );
    },
    enabled: canView && managedProductId > 0,
    staleTime: 2 * 60_000,
    throwOnError: readErrorExceptNotFoundReachesBoundary,
  });
}
