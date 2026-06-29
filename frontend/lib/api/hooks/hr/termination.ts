"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface TerminationEmployee {
  id: string;
  name: string | null;
  email: string;
  designation: string | null;
  employeeId: string | null;
}

export type TerminationStatus =
  | "DRAFT"
  | "PENDING_CEO"
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
  ceoRemarks: string | null;
  ceoReviewedBy: string | null;
  ceoReviewedAt: string | null;
  emailSentAt: string | null;
  emailStatus: string | null;
  initiatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  employee?: TerminationEmployee;
  user?: { id: string; name: string | null; image: string | null; email: string; designation: string | null; joiningDate?: string | null } | null;
  initiator?: { id: string; name: string | null } | null;
  ceoReviewer?: { id: string; name: string | null } | null;
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

const terminationKeys = {
  all: [...queryKeys.hr.all, "termination"] as const,
  list: () => [...terminationKeys.all, "list"] as const,
  detail: (id: number) => [...terminationKeys.all, "detail", id] as const,
};

export function useTerminations() {
  return useQuery({
    queryKey: terminationKeys.list(),
    queryFn: () => apiClient.get<Termination[]>("/hr/termination"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTerminationInput) =>
      apiClient.post<Termination>("/hr/termination", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: terminationKeys.all }),
  });
}

export function useSubmitTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}/submit`),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({ queryKey: terminationKeys.detail(id) });
    },
  });
}

export function useCeoReviewTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      remarks,
    }: {
      id: number;
      decision: "approve" | "reject";
      remarks?: string;
    }) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}/ceo-review`, {
        decision,
        remarks,
      }),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({ queryKey: terminationKeys.detail(id) });
    },
  });
}

export function useSendTerminationEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(`/hr/termination/${id}/send-email`, {}),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({ queryKey: terminationKeys.detail(id) });
    },
  });
}

export function useCompleteTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}/complete`),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({ queryKey: terminationKeys.detail(id) });
    },
  });
}
