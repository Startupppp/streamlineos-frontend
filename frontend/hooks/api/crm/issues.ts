"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type {
  CreateIssueInput,
  IssueDetailResponse,
  IssueFilters,
  IssuePage,
  IssueRecordType,
  IssueRecordTypesResponse,
  IssueTransitionStage,
  UpdateIssueInput,
} from "@/types/crm/issues";

/**
 * Issues, tasks and complaints.
 *
 * No hook here knows what a field is called. The layout arrives from the server
 * and the renderer consumes it, so adding a field to a record type is a server
 * change alone — which is the property the whole engine exists for and the one
 * a hand-written client would quietly give back.
 */

const BASE = "/crm/issues";

/**
 * The three descriptions.
 *
 * Cached hard: a layout changes when the platform ships one, not while somebody
 * is working. Refetching it per list would be a request that always returns the
 * same bytes on every keystroke of a filter.
 */
export function useIssueRecordTypes() {
  return useGatedQuery("crm:issues:view", {
    queryKey: queryKeys.crm.issueRecordTypes(),
    queryFn: ({ signal }) => apiClient.get<IssueRecordTypesResponse>(`${BASE}/record-types`, undefined, signal),
    staleTime: 30 * 60_000,
  });
}

export interface UseIssuesParams extends IssueFilters {
  recordType: IssueRecordType;
  limit?: number;
  cursor?: string;
}

export function useIssues(params: UseIssuesParams) {
  const { recordType, limit = 25, cursor, ...filters } = params;

  return useGatedQuery("crm:issues:view", {
    queryKey: queryKeys.crm.issues({ recordType, limit, cursor, ...filters }),
    queryFn: () => {
      const search = new URLSearchParams({ recordType, limit: String(limit) });
      if (cursor) search.set("cursor", cursor);
      for (const [key, value] of Object.entries(filters))
        if (value !== undefined && value !== "") search.set(key, String(value));
      return apiClient.get<IssuePage>(`${BASE}?${search.toString()}`);
    },
    staleTime: 30_000,
  });
}

export function useIssue(issueRecordId: string | null) {
  return useGatedQuery("crm:issues:view", {
    queryKey: queryKeys.crm.issue(issueRecordId ?? ""),
    queryFn: ({ signal }) => apiClient.get<IssueDetailResponse>(`${BASE}/${issueRecordId}`, undefined, signal),
    enabled: !!issueRecordId,
  });
}

/**
 * Everything under the issues prefix, invalidated together.
 *
 * The list and the open record both carry a stage, so a transition that
 * refreshed only one would leave the other showing a stage the ledger has
 * already moved past. The record-types query sits under the same prefix and is
 * refetched too — one extra request, on a mutation, for a cache that cannot
 * disagree with itself.
 */
function useInvalidateIssues() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.crm.issuesRoot() });
  };
}

export function useCreateIssue() {
  const invalidate = useInvalidateIssues();

  return useMutation({
    mutationKey: ["crm", "issues", "create"],
    mutationFn: (input: CreateIssueInput) =>
      apiClient.post<IssueDetailResponse>(BASE, input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateIssue() {
  const invalidate = useInvalidateIssues();

  return useMutation({
    mutationKey: ["crm", "issues", "update"],
    mutationFn: ({ issueRecordId, ...patch }: UpdateIssueInput & { issueRecordId: string }) =>
      apiClient.patch<IssueDetailResponse>(`${BASE}/${issueRecordId}`, patch),
    onSuccess: () => invalidate(),
  });
}

/**
 * Move a record's stage.
 *
 * A separate call from editing the record, and that separation is the point: the
 * generated form cannot move a stage because the field is read-only in the
 * description, so this route is the only path and the ledger cannot be bypassed.
 */
export function useTransitionIssue() {
  const invalidate = useInvalidateIssues();

  return useMutation({
    mutationKey: ["crm", "issues", "transition"],
    mutationFn: ({
      issueRecordId,
      ...body
    }: {
      issueRecordId: string;
      toStage: IssueTransitionStage;
      reason?: string;
    }) => apiClient.post<IssueDetailResponse>(`${BASE}/${issueRecordId}/stage`, body),
    onSuccess: () => invalidate(),
  });
}

/** Raise a record above its owner. A reason is required, not optional. */
export function useEscalateIssue() {
  const invalidate = useInvalidateIssues();

  return useMutation({
    mutationKey: ["crm", "issues", "escalate"],
    mutationFn: ({ issueRecordId, reason }: { issueRecordId: string; reason: string }) =>
      apiClient.post<IssueDetailResponse>(`${BASE}/${issueRecordId}/escalate`, { reason }),
    onSuccess: () => invalidate(),
  });
}
