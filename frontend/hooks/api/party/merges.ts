"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, newIdempotencyKey } from "@/lib/api-client";
import { accessAndCrmQueryKeys } from "@/lib/query-keys/access-and-crm";
import { customerWorkQueryKeys } from "@/lib/query-keys/customer-work";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  MergePartiesInput,
  MergePartiesResult,
  PartyDuplicatesPage,
  PartyMergesPage,
  RevertMergeResult,
} from "@/types/party/merges";

/**
 * Merging duplicate customer records.
 *
 * One mechanism, at the grain the data is actually stored at. A "contact" is a
 * numeric alias for a party (`contact_party_map`), so merging two contacts and
 * merging the two parties behind them were never two operations — the
 * contact-grain endpoints were a second, partial implementation of these, and
 * they are gone.
 *
 * What these carry that the retired pair could not: a `partyMergeId`, so the
 * merge can be undone later rather than only from the toast that announced it,
 * and a `candidateId`, so dismissing a false positive is remembered instead of
 * being recomputed away on the next read.
 */

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
    queryFn: () => apiClient.get<PartyDuplicatesPage>("/party/duplicates", query),
    // A queue a person works through: fast-changing enough that a stale page
    // means merging a pair somebody else just resolved.
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
    queryFn: () => apiClient.get<PartyMergesPage>("/party/merges", query),
    staleTime: 30_000,
  });
}

/**
 * Everything a merge or a revert touches.
 *
 * A merge moves a record out of every list that could be showing it — parties,
 * contacts, companies, clients, leads all read the same `business_parties` row
 * through their own alias — so invalidating the party prefix alone would leave
 * the merged-away duplicate on whichever CRM screen the user came from.
 */
function invalidateMergeSurfaces(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.all });
  void qc.invalidateQueries({ queryKey: customerWorkQueryKeys.contacts.all });
  void qc.invalidateQueries({ queryKey: accessAndCrmQueryKeys.crmOrganizations.all });
  void qc.invalidateQueries({ queryKey: customerWorkQueryKeys.clients.all });
  void qc.invalidateQueries({ queryKey: customerWorkQueryKeys.leads.all });
}

export function useMergeParties() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "merges", "create"] as const,
    mutationFn: (input: MergePartiesInput) =>
      apiClient.post<MergePartiesResult>("/party/merges", input, {
        /*
         * Minted per intent, not per request. `authedFetch` supplies a fresh key
         * to any mutation that arrives without one, which stops `@Idempotent`
         * from 400ing but makes every retry a new operation — so a merge the
         * user fired once, whose response was lost to a flaky connection, would
         * merge again on retry. `newIdempotencyKey` here is minted when the
         * mutation is called and reused for its retries, which is what the
         * server's replay is for.
         */
        headers: { "Idempotency-Key": newIdempotencyKey() },
      }),
    onSuccess: () => invalidateMergeSurfaces(qc),
  });
}

export function useRevertPartyMerge() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "merges", "revert"] as const,
    mutationFn: (partyMergeId: string) =>
      apiClient.post<RevertMergeResult>(
        `/party/merges/${partyMergeId}/revert`,
        {},
        { headers: { "Idempotency-Key": newIdempotencyKey() } },
      ),
    onSuccess: () => invalidateMergeSurfaces(qc),
  });
}

export function useDismissPartyDuplicate() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "duplicates", "dismiss"] as const,
    mutationFn: (candidateId: string) =>
      apiClient.delete<{ dismissed: boolean }>(`/party/duplicates/${candidateId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.party.all });
    },
  });
}

/**
 * Asks the detector to look for records matching this one.
 *
 * Scoped to one party rather than sweeping the tenant, because the sweep is a
 * job and this is a button: it is what a reviewer presses on a record they
 * suspect is a duplicate, and its results land in the same queue.
 */
export function useDetectPartyDuplicates() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["party", "duplicates", "detect"] as const,
    mutationFn: (partyId: string) =>
      apiClient.post<{
        autoMerged: { survivorPartyId: string; mergedPartyId: string }[];
        queued: { candidateId: string; otherPartyId: string; score: number }[];
      }>(
        `/party/parties/${partyId}/detect-duplicates`,
        {},
        { headers: { "Idempotency-Key": newIdempotencyKey() } },
      ),
    onSuccess: () => invalidateMergeSurfaces(qc),
  });
}
