"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

interface TerminationEmployee {
  id: string;
  name: string | null;
  email: string;
  designation: string | null;
  employeeId: string | null;
}

export type TerminationStatus =
  | "DRAFT"
  | "PENDING_FINAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT"
  | "COMPLETED";

export interface Termination {
  id: number;
  orgId: string;
  userId: string;
  status: TerminationStatus | null;
  reasons: string[] | null;
  detailedExplanation: string | null;
  effectiveDate: string | null;
  severanceAmount: string | null;
  noticePeriodWaived: boolean | null;
  terminationLetterUrl: string | null;
  supportingDocUrls: string[] | null;
  internalNotes: string | null;
  finalRemarks: string | null;
  finalReviewedBy: string | null;
  finalReviewedAt: string | null;
  emailSentAt: string | null;
  emailStatus: string | null;
  initiatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  employee?: TerminationEmployee;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
    designation: string | null;
    joiningDate?: string | null;
  } | null;
  initiator?: { id: string; name: string | null } | null;
  finalReviewer?: { id: string; name: string | null } | null;
}

interface CreateTerminationInput {
  userId: string;
  reasons: string[];
  detailedExplanation: string;
  effectiveDate: string;
  severanceAmount?: number;
  noticePeriodWaived?: boolean;
  internalNotes?: string;
}

export interface TerminationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TerminationListResponse {
  data: Termination[];
  pagination: TerminationPagination;
  statusCounts: Record<string, number>;
}

export interface UseTerminationsParams {
  page?: number;
  limit?: number;
  status?: TerminationStatus;
}

const terminationKeys = {
  all: [...queryKeys.hr.all, "termination"] as const,
  list: (
    params: Required<Omit<UseTerminationsParams, "status">> & {
      status: string;
    },
  ) => [...terminationKeys.all, "list", params] as const,
  detail: (id: number) => [...terminationKeys.all, "detail", id] as const,
};

export function useTerminations(params: UseTerminationsParams = {}) {
  const canView = useCan("hr:exit:manage");
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const search = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (params.status) search.set("status", params.status);
  return useQuery({
    queryKey: terminationKeys.list({
      page,
      limit,
      status: params.status ?? "ALL",
    }),
    queryFn: () =>
      apiClient.get<TerminationListResponse>(
        `/hr/termination?${search.toString()}`,
      ),
    enabled: canView,
    staleTime: 2 * 60_000,
  });
}

export function useCreateTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...terminationKeys.all, "create"],
    mutationFn: (data: CreateTerminationInput) =>
      apiClient.post<Termination>("/hr/termination", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: terminationKeys.all }),
  });
}

export function useSubmitTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...terminationKeys.all, "submit"],
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}/submit`),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({ queryKey: terminationKeys.detail(id) });
    },
  });
}

export function useFinalReviewTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...terminationKeys.all, "final-review"],
    mutationFn: ({
      id,
      decision,
      remarks,
    }: {
      id: number;
      decision: "approve" | "reject";
      remarks?: string;
    }) =>
      apiClient.patch<{ success: boolean }>(
        `/hr/termination/${id}/final-review`,
        {
          decision,
          remarks,
        },
      ),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({ queryKey: terminationKeys.detail(id) });
    },
  });
}

export function useSendTerminationEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...terminationKeys.all, "send-email"],
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(
        `/hr/termination/${id}/send-email`,
        {},
      ),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({ queryKey: terminationKeys.detail(id) });
    },
  });
}

export function useCompleteTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [...terminationKeys.all, "complete"],
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}/complete`),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({ queryKey: terminationKeys.detail(id) });
    },
  });
}
