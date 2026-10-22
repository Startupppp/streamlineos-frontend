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
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const issueRecordTypesLazy = lazyContract(() => import("@/hooks/api/crm/issues-schema").then((m) => m.issueRecordTypesContract));
const issueListLazy = lazyContract(() => import("@/hooks/api/crm/issues-schema").then((m) => m.issueListContract));
const issueDetailLazy = lazyContract(() => import("@/hooks/api/crm/issues-schema").then((m) => m.issueDetailContract));
const issueDeleteLazy = lazyContract(() => import("@/hooks/api/crm/issues-schema").then((m) => m.issueDeleteContract));



const BASE = "/crm/issues";

export function useIssueRecordTypes() {
  return useGatedQuery("crm:issues:view", {
    queryKey: queryKeys.crm.issueRecordTypes(),
    queryFn: ({ signal }) => apiClient.get<IssueRecordTypesResponse>(`${BASE}/record-types`, undefined, signal, issueRecordTypesLazy),
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
    queryFn: ({ signal }) => {
      const search = new URLSearchParams({ recordType, limit: String(limit) });
      if (cursor) search.set("cursor", cursor);
      for (const [key, value] of Object.entries(filters))
        if (value !== undefined && value !== "") search.set(key, String(value));
      return apiClient.get<IssuePage>(`${BASE}?${search.toString()}`, undefined, signal, issueListLazy);
    },
    staleTime: 30_000,
  });
}

export function useIssue(issueRecordId: string | null) {
  return useGatedQuery("crm:issues:view", {
    queryKey: queryKeys.crm.issue(issueRecordId ?? ""),
    queryFn: ({ signal }) => apiClient.get<IssueDetailResponse>(`${BASE}/${issueRecordId}`, undefined, signal, issueDetailLazy),
    enabled: !!issueRecordId,
  });
}

function useInvalidateIssues() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.crm.issuesRoot() });
  };
}

export function useCreateIssue() {
  const invalidate = useInvalidateIssues();

  return useAuthorizedMutation("crm:issues:manage", {
    mutationKey: ["crm", "issues", "create"],
    mutationFn: (input: CreateIssueInput) =>
      apiClient.post<IssueDetailResponse>("/crm/issues", input, undefined, issueDetailLazy),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateIssue() {
  const invalidate = useInvalidateIssues();

  return useAuthorizedMutation("crm:issues:manage", {
    mutationKey: ["crm", "issues", "update"],
    mutationFn: ({ issueRecordId, ...patch }: UpdateIssueInput & { issueRecordId: string }) =>
      apiClient.patch<IssueDetailResponse>(`${BASE}/${issueRecordId}`, patch, undefined, issueDetailLazy),
    onSuccess: () => invalidate(),
  });
}

export function useTransitionIssue() {
  const invalidate = useInvalidateIssues();

  return useAuthorizedMutation("crm:issues:manage", {
    mutationKey: ["crm", "issues", "transition"],
    mutationFn: ({
      issueRecordId,
      ...body
    }: {
      issueRecordId: string;
      toStage: IssueTransitionStage;
      reason?: string;
    }) => apiClient.post<IssueDetailResponse>(`${BASE}/${issueRecordId}/stage`, body, undefined, issueDetailLazy),
    onSuccess: () => invalidate(),
  });
}

export function useEscalateIssue() {
  const invalidate = useInvalidateIssues();

  return useAuthorizedMutation("crm:issues:escalate", {
    mutationKey: ["crm", "issues", "escalate"],
    mutationFn: ({ issueRecordId, reason }: { issueRecordId: string; reason: string }) =>
      apiClient.post<IssueDetailResponse>(`${BASE}/${issueRecordId}/escalate`, { reason }, undefined, issueDetailLazy),
    onSuccess: () => invalidate(),
  });
}
