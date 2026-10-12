"use client";

import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { FeedbucketSubmission, PaginatedFeedbucketSubmissions } from "@/types/feedbucket";
import { useQueryClient } from "@tanstack/react-query";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const opportunityMinimalContract = z.object({
  id: z.number(),
  title: z.string(),
  state: z.string(),
});

const opportunityListContract = z.object({
  data: z.array(opportunityMinimalContract),
  pagination: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    limit: z.number(),
  }),
});

const addEvidenceContract = z.object({
  id: z.number(),
  opportunityId: z.number(),
});

type AddEvidenceResult = z.infer<typeof addEvidenceContract>;

function withOpportunity<T extends { id: number; opportunityIds: number[] }>(
  row: T,
  submissionId: number,
  opportunityId: number,
): T {
  if (row.id !== submissionId || row.opportunityIds.includes(opportunityId)) return row;
  return { ...row, opportunityIds: [...row.opportunityIds, opportunityId].sort((a, b) => a - b) };
}

const opportunityListC = lazyContract(() => Promise.resolve(opportunityListContract));
const addEvidenceC = lazyContract(() => Promise.resolve(addEvidenceContract));

export type OpportunityMinimal = z.infer<typeof opportunityMinimalContract>;

const OPPORTUNITIES_PAGE_SIZE = 25;

export function useProductOpportunitiesSearch(
  managedProductId: number,
  search: string,
  enabled = true,
  options: { cursor?: string } = {},
) {
  const { cursor } = options;
  return useGatedQuery("build:managed-products:view", {
    queryKey: [
      ...growthAndSignQueryKeys.feedbucket.all,
      "opportunities",
      managedProductId,
      search,
      cursor ?? null,
    ],
    queryFn: ({ signal }) =>
      apiClient.get<{ data: OpportunityMinimal[]; pagination: { hasMore: boolean; nextCursor: string | null; limit: number } }>(
        `/build/managed-products/${managedProductId}/opportunities`,
        { search: search.trim() || undefined, limit: OPPORTUNITIES_PAGE_SIZE, cursor },
        signal,
        opportunityListC,
      ),
    staleTime: 30_000,
    enabled: enabled && managedProductId > 0,
    ...INLINE_READ_ERROR,
  });
}

export function useAddEvidenceToOpportunity() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    AddEvidenceResult,
    Error,
    { managedProductId: number; opportunityId: number; submissionId: number }
  >("build:managed-products:update", {
    mutationKey: ["build", "managed-products", "opportunity", "evidence", "add"],
    mutationFn: ({ managedProductId, opportunityId, submissionId }) =>
      apiClient.post<AddEvidenceResult>(
        `/build/managed-products/${managedProductId}/opportunities/${opportunityId}/evidence`,
        { sourceKind: "feedbucket_submission", sourceId: submissionId },
        undefined,
        addEvidenceC,
      ),
    onSuccess: (result, { managedProductId, submissionId }) => {
      qc.setQueryData<FeedbucketSubmission>(
        growthAndSignQueryKeys.feedbucket.submission(submissionId),
        (old) => (old ? withOpportunity(old, submissionId, result.opportunityId) : old),
      );
      qc.setQueriesData<PaginatedFeedbucketSubmissions>(
        { queryKey: growthAndSignQueryKeys.feedbucket.submissions() },
        (old) =>
          old && Array.isArray(old.data)
            ? { ...old, data: old.data.map((row) => withOpportunity(row, submissionId, result.opportunityId)) }
            : old,
      );
      void qc.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.managedProducts.opportunities(managedProductId),
        refetchType: "none",
      });
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
