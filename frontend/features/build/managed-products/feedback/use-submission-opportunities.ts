"use client";

import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { useQueryClient } from "@tanstack/react-query";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const opportunityMinimalContract = z.object({
  id: z.number(),
  title: z.string(),
  state: z.string(),
});

const opportunityListContract = z.object({
  success: z.literal(true),
  data: z.object({
    data: z.array(opportunityMinimalContract),
    pagination: z.object({
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
      limit: z.number(),
    }),
  }),
});

const addEvidenceContract = z.object({
  success: z.literal(true),
  data: z.object({ id: z.number() }),
});

const opportunityListC = lazyContract(() => Promise.resolve(opportunityListContract));
const addEvidenceC = lazyContract(() => Promise.resolve(addEvidenceContract));

export type OpportunityMinimal = z.infer<typeof opportunityMinimalContract>;

export function useProductOpportunitiesSearch(
  managedProductId: number,
  search: string,
) {
  return useGatedQuery("feedbucket:submissions:view", {
    queryKey: [
      ...growthAndSignQueryKeys.feedbucket.all,
      "opportunities",
      managedProductId,
      search,
    ],
    queryFn: ({ signal }) =>
      apiClient.get<{ data: OpportunityMinimal[]; pagination: { hasMore: boolean; nextCursor: string | null; limit: number } }>(
        `/build/managed-products/${managedProductId}/opportunities`,
        { search: search.trim() || undefined, limit: 25 },
        signal,
        opportunityListC,
      ),
    staleTime: 30_000,
    enabled: managedProductId > 0,
    ...INLINE_READ_ERROR,
  });
}

export function useAddEvidenceToOpportunity() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    { success: true; data: { id: number } },
    Error,
    { managedProductId: number; opportunityId: number; submissionId: number }
  >("build:managed-products:update", {
    mutationKey: ["build", "managed-products", "opportunity", "evidence", "add"],
    mutationFn: ({ managedProductId, opportunityId, submissionId }) =>
      apiClient.post<{ success: true; data: { id: number } }>(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/evidence`,
        { sourceKind: "feedbucket_submission", sourceId: submissionId },
        undefined,
        addEvidenceC,
      ),
    onSuccess: (_, { managedProductId }) => {
      void qc.invalidateQueries({
        queryKey: [
          ...growthAndSignQueryKeys.feedbucket.all,
          "opportunities",
          managedProductId,
        ],
        exact: false,
        refetchType: "none",
      });
    },
  });
}
