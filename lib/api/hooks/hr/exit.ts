"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Resignation {
  id: number;
  orgId: string;
  userId: string;
  reason: string | null;
  reasonCategory: string | null;
  willingForExitInterview: boolean | null;
  companyFeedback: string | null;
  lastWorkingDate: string | null;
  noticePeriodDays: number | null;
  status: "SUBMITTED" | "PENDING_HR" | "HR_APPROVED" | "CEO_APPROVED" | "IN_PROGRESS" | "APPROVED" | "WITHDRAWN" | "COMPLETED" | "REJECTED" | null;
  approvedBy: string | null;
  approvedAt: Date | string | null;
  hrReviewedAt: string | null;
  hrRemarks: string | null;
  ceoReviewedAt: string | null;
  ceoRemarks: string | null;
  exitInterviewNotes: string | null;
  exitInterviewDate: Date | string | null;
  feedback: { question: string; answer: string }[] | null;
  createdAt: Date | string | null;
  user?: { id: string; name: string | null; image: string | null; email: string; designation: string | null } | null;
  checklists?: { id: number; item: string; status: string | null; completedAt: Date | string | null }[];
}

export interface ResignationProgressStep {
  step: string;
  label: string;
  status: "completed" | "current" | "pending";
  timestamp?: string;
}

export interface ResignationProgress {
  steps: ResignationProgressStep[];
}

const exitKeys = {
  all: [...queryKeys.hr.all, "exit"] as const,
  list: () => [...exitKeys.all, "list"] as const,
  progress: (id: number) => [...exitKeys.all, "progress", id] as const,
};

export function useResignations() {
  return useQuery({
    queryKey: exitKeys.list(),
    queryFn: () => apiClient.get<Resignation[]>("/hr/exit"),
  });
}

export function useCreateResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      reason: string;
      lastWorkingDate: string;
      noticePeriodDays?: number;
      reasonCategory?: string;
      willingForExitInterview?: boolean;
      companyFeedback?: string;
    }) => apiClient.post<Resignation>("/hr/exit", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useUpdateResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: number;
      status?: string;
      exitInterviewNotes?: string;
      exitInterviewDate?: string;
      feedback?: { question: string; answer: string }[];
      checklistItems?: string[];
    }) => apiClient.patch<{ success: boolean }>(`/hr/exit/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useHrReviewResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/exit/${id}/hr-review`, { action, remarks }),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useCeoReviewResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/exit/${id}/ceo-review`, { action, remarks }),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useWithdrawResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/exit/${id}/withdraw`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useResignationProgress(id: number, enabled: boolean) {
  return useQuery({
    queryKey: exitKeys.progress(id),
    queryFn: () => apiClient.get<ResignationProgress>(`/hr/exit/${id}/progress`),
    enabled,
  });
}
