"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Resignation {
  id: number;
  orgId: string;
  userId: string;
  reason: string | null;
  reasonCategory: string | null;
  lastWorkingDate: string | null;
  noticePeriodDays: number | null;
  status: "SUBMITTED" | "PENDING_HR" | "HR_APPROVED" | "CEO_APPROVED" | "IN_PROGRESS" | "APPROVED" | "WITHDRAWN" | "COMPLETED" | "REJECTED" | null;
  resignationLetterUrl: string | null;
  approvedBy: string | null;
  approvedAt: Date | string | null;
  hrReviewedBy: string | null;
  hrReviewedAt: Date | string | null;
  hrRemarks: string | null;
  ceoReviewedBy: string | null;
  ceoReviewedAt: Date | string | null;
  ceoRemarks: string | null;
  willingForExitInterview: boolean | null;
  companyFeedback: string | null;
  exitInterviewNotes: string | null;
  exitInterviewDate: Date | string | null;
  feedback: { question: string; answer: string }[] | null;
  createdAt: Date | string | null;
  user?: { id: string; name: string | null; image: string | null; email: string; designation: string | null; joiningDate?: string | null } | null;
  hrReviewer?: { id: string; name: string | null } | null;
  ceoReviewer?: { id: string; name: string | null } | null;
  checklists?: { id: number; item: string; status: string | null; completedAt: Date | string | null }[];
}

interface ResignationProgressStep {
  step: string;
  label: string;
  status: "completed" | "current" | "pending";
  timestamp?: string;
}

export interface ResignationProgress {
  label: string;
  status: "completed" | "active" | "rejected" | "pending";
  actor: string | null;
  timestamp: string | null;
  remarks: string | null;
  steps: ResignationProgressStep[];
}

export interface PaginatedResignations {
  data: Resignation[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface ResignationListParams {
  page?: number;
  limit?: number;
  status?: string;
}

const exitKeys = {
  all: [...queryKeys.hr.all, "exit"] as const,
  list: () => [...exitKeys.all, "list"] as const,
  progress: (id: number) => [...exitKeys.all, "progress", id] as const,
};

export function useResignations(params?: ResignationListParams) {
  return useQuery({
    queryKey: [...exitKeys.list(), params] as const,
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.page) search.set("page", String(params.page));
      if (params?.limit) search.set("limit", String(params.limit));
      if (params?.status) search.set("status", params.status);
      const qs = search.toString();
      return apiClient.get<PaginatedResignations>(`/hr/exit${qs ? `?${qs}` : ""}`);
    },
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "exit", "create"],
    mutationFn: (data: {
      reason: string;
      reasonCategory?: string;
      lastWorkingDate: string;
      noticePeriodDays?: number;
      willingForExitInterview?: boolean;
      companyFeedback?: string;
      resignationLetterUrl?: string;
    }) => apiClient.post<Resignation>("/hr/exit", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useHrReviewResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "exit", "hr-review"],
    mutationFn: ({ id, action, remarks }: { id: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/exit/${id}/hr-review`, { decision: action, remarks }),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useCeoReviewResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "exit", "ceo-review"],
    mutationFn: ({ id, action, remarks }: { id: number; action: "approve" | "reject"; remarks?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/exit/${id}/ceo-review`, { decision: action, remarks }),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useWithdrawResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "exit", "withdraw"],
    mutationFn: ({ id }: { id: number }) =>
      apiClient.patch<{ success: boolean }>(`/hr/exit/${id}/withdraw`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: exitKeys.list() }),
  });
}

export function useResignationProgress(id: number, enabled: boolean) {
  return useQuery({
    queryKey: exitKeys.progress(id),
    queryFn: () => apiClient.get<ResignationProgress>(`/hr/exit/${id}/progress`),
    staleTime: 2 * 60_000,
    enabled,
  });
}

export interface ExitChecklistItem {
  id: number;
  item: string;
  status: string | null;
  completedAt: Date | string | null;
}

const checklistKeys = {
  detail: (resignationId: number) => [...queryKeys.hr.all, "exit", "checklist", resignationId] as const,
};

export function useExitChecklist(resignationId: number) {
  return useQuery<ExitChecklistItem[]>({
    queryKey: checklistKeys.detail(resignationId),
    queryFn: async () => {
      const data = await apiClient.get<{ checklists: ExitChecklistItem[] }>(`/hr/exit/${resignationId}`);
      return data.checklists ?? [];
    },
    enabled: resignationId > 0,
    staleTime: 30_000,
  });
}
