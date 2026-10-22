"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { customerWorkQueryKeys } from "@/lib/query-keys/customer-work";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import type {
  MergePartiesInput,
  MergePartiesResult,
  PartyDuplicatesPage,
  PartyMergesPage,
  RevertMergeResult,
} from "@/types/party/merges";


export interface PartyDuplicatesParams {
  page?: number;
  limit?: number;
  status?: "PENDING" | "MERGED" | "DISMISSED";
}

export function usePartyDuplicates(params: PartyDuplicatesParams = {}) {
  const { page = 1, limit = 20, status = "PENDING" } = params;
  const query = { page, limit, status };

  return useGatedQuery("party:duplicates:view", {
    queryKey: directoryAndOwnershipQueryKeys.party.duplicates(query),
    queryFn: ({ signal }) =>
      apiClient.get<PartyDuplicatesPage>("/party/duplicates", query, signal),
    staleTime: 30_000,
  });
}

export interface PartyMergesParams {
  page?: number;
  limit?: number;
  includeReverted?: boolean;
}

export function usePartyMerges(params: PartyMergesParams = {}) {
  const { page = 1, limit = 20, includeReverted = false } = params;
  const query = { page, limit, includeReverted };

  return useGatedQuery("party:merges:manage", {
    queryKey: directoryAndOwnershipQueryKeys.party.merges(query),
    queryFn: ({ signal }) => apiClient.get<PartyMergesPage>("/party/merges", query, signal),
    staleTime: 30_000,
  });
}

function invalidateMergeSurfaces(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.all });
  void qc.invalidateQueries({ queryKey: customerWorkQueryKeys.contacts.all });
  void qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.crmOrganizations.all });
  void qc.invalidateQueries({ queryKey: customerWorkQueryKeys.clients.all });
  void qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
}

export function useMergeParties() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<MergePartiesResult, Error, MergePartiesInput>(
    "party:merges:manage",
    {
      mutationKey: ["party", "merges", "create"] as const,
      mutationFn: (input, idempotencyKey) =>
        apiClient.post<MergePartiesResult>("/party/merges", input, {
          headers: { "Idempotency-Key": idempotencyKey },
        }),
      onSuccess: () => invalidateMergeSurfaces(qc),
    },
  );
}

export function useRevertPartyMerge() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<RevertMergeResult, Error, string>(
    "party:merges:manage",
    {
      mutationKey: ["party", "merges", "revert"] as const,
      mutationFn: (partyMergeId, idempotencyKey) =>
        apiClient.post<RevertMergeResult>(
          `/party/merges/${partyMergeId}/revert`,
          {},
          { headers: { "Idempotency-Key": idempotencyKey } },
        ),
      onSuccess: () => invalidateMergeSurfaces(qc),
    },
  );
}

export function useDismissPartyDuplicate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("party:merges:manage", {
    mutationKey: ["party", "duplicates", "dismiss"] as const,
    mutationFn: (candidateId: string) =>
      apiClient.delete<{ dismissed: boolean }>(`/party/duplicates/${candidateId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.all });
    },
  });
}

export function useDetectPartyDuplicates() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<
    {
      autoMerged: { survivorPartyId: string; mergedPartyId: string }[];
      queued: { candidateId: string; otherPartyId: string; score: number }[];
    },
    Error,
    string
  >("party:merges:manage", {
    mutationKey: ["party", "duplicates", "detect"] as const,
    mutationFn: (partyId, idempotencyKey) =>
      apiClient.post<{
        autoMerged: { survivorPartyId: string; mergedPartyId: string }[];
        queued: { candidateId: string; otherPartyId: string; score: number }[];
      }>(
        `/party/parties/${partyId}/detect-duplicates`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: () => invalidateMergeSurfaces(qc),
  });
}
