"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TerminationEmployee {
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
  status: TerminationStatus | null;
  reasons: string[];
  detailedExplanation: string;
  effectiveDate: string;
  severanceAmount: string | null;
  noticePeriodWaived: boolean | null;
  internalNotes: string | null;
  terminationLetterUrl: string | null;
  ceoRemarks: string | null;
  ceoReviewedAt: string | null;
  emailSentAt: string | null;
  emailStatus: string | null;
  initiatedBy: string | null;
  ceoReviewedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  employee: TerminationEmployee;
}

export interface CreateTerminationInput {
  userId: string;
  reasons: string[];
  detailedExplanation: string;
  effectiveDate: string;
  severanceAmount?: number;
  noticePeriodWaived?: boolean;
  internalNotes?: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useTerminations() {
  return useQuery({
    queryKey: queryKeys.hr.terminations(),
    queryFn: () => apiClient.get<Termination[]>("/hr/termination"),
  });
}

export function useTermination(id: number) {
  return useQuery({
    queryKey: queryKeys.hr.termination(id),
    queryFn: () => apiClient.get<Termination>(`/hr/termination/${id}`),
    enabled: id > 0,
  });
}

export function useCreateTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTerminationInput) =>
      apiClient.post<Termination>("/hr/termination", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.terminations() }),
  });
}

export function useSubmitTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}`, { action: "submit" }),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.terminations() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.termination(id) });
    },
  });
}

export function useCompleteTermination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<{ success: boolean }>(`/hr/termination/${id}`, { action: "complete" }),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.terminations() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.termination(id) });
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
      void qc.invalidateQueries({ queryKey: queryKeys.hr.terminations() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.termination(id) });
    },
  });
}

export function useSendTerminationEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ success: boolean }>(`/hr/termination/${id}/send-email`, {}),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.terminations() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.termination(id) });
    },
  });
}
