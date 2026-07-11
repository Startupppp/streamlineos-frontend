"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

export type AccommodationType = "equipment" | "schedule" | "workspace" | "medical_restriction" | "other";
export type AccommodationStatus = "requested" | "under_review" | "approved" | "denied" | "implemented";
export type AccommodationTaskStatus = "pending" | "in_progress" | "completed";

export interface AccommodationRequest {
  id: string;
  orgId: string;
  userId: string;
  type: AccommodationType;
  description: string;
  confidentialMedicalNote: string | null;
  status: AccommodationStatus;
  reviewedBy: string | null;
  reviewDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccommodationTask {
  id: string;
  orgId: string;
  requestId: string;
  title: string;
  assigneeUserId: string | null;
  status: AccommodationTaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ListAccommodationsParams {
  page?: number;
  limit?: number;
  userId?: string;
  status?: AccommodationStatus;
  type?: AccommodationType;
}

const BASE = "/hr/enterprise/ops/accommodations";

const accKeys = {
  all: ["hr-accommodations"] as const,
  list: (p: ListAccommodationsParams) => ["hr-accommodations", "list", p] as const,
  detail: (id: string) => ["hr-accommodations", "detail", id] as const,
  tasks: (id: string) => ["hr-accommodations", "tasks", id] as const,
};

export function useAccommodations(params: ListAccommodationsParams = {}) {
  return useQuery({
    queryKey: accKeys.list(params),
    queryFn: () => apiClient.get<PaginatedResult<AccommodationRequest>>(BASE, params as Record<string, unknown>),
    staleTime: 30_000,
  });
}

export function useAccommodation(id: string) {
  return useQuery({
    queryKey: accKeys.detail(id),
    queryFn: () => apiClient.get<AccommodationRequest>(`${BASE}/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useAccommodationTasks(requestId: string) {
  return useQuery({
    queryKey: accKeys.tasks(requestId),
    queryFn: () => apiClient.get<AccommodationTask[]>(`${BASE}/${requestId}/tasks`),
    enabled: !!requestId,
    staleTime: 30_000,
  });
}

export function useCreateAccommodation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-accommodations", "create"],
    mutationFn: (body: {
      userId: string;
      type: AccommodationType;
      description: string;
      confidentialMedicalNote?: string;
    }) => apiClient.post<AccommodationRequest>(BASE, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accKeys.all });
      toast.success("Accommodation request created");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateAccommodation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-accommodations", "update", id],
    mutationFn: (body: Partial<{
      type: AccommodationType;
      description: string;
      confidentialMedicalNote: string | null;
      status: AccommodationStatus;
      note: string | null;
    }>) => apiClient.patch<AccommodationRequest>(`${BASE}/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: accKeys.all });
      toast.success("Accommodation updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useApproveAccommodation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-accommodations", "approve", id],
    mutationFn: (body: {
      note?: string;
      tasks?: Array<{ title: string; assigneeUserId?: string; dueDate?: string }>;
    }) => apiClient.post<AccommodationRequest>(`${BASE}/${id}/approve`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: accKeys.all });
      toast.success("Accommodation approved");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteAccommodation() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-accommodations", "delete"],
    mutationFn: (id: string) => apiClient.delete(`${BASE}/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accKeys.all });
      toast.success("Accommodation deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateAccommodationTask(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-accommodations", "task-create", requestId],
    mutationFn: (body: { title: string; assigneeUserId?: string; dueDate?: string }) =>
      apiClient.post<AccommodationTask>(`${BASE}/${requestId}/tasks`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accKeys.tasks(requestId) });
      toast.success("Task created");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateAccommodationTask(requestId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-accommodations", "task-update", taskId],
    mutationFn: (body: Partial<{ title: string; status: AccommodationTaskStatus; dueDate: string | null }>) =>
      apiClient.patch<AccommodationTask>(`${BASE}/${requestId}/tasks/${taskId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accKeys.tasks(requestId) });
      toast.success("Task updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteAccommodationTask(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-accommodations", "task-delete"],
    mutationFn: (taskId: string) => apiClient.delete(`${BASE}/${requestId}/tasks/${taskId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accKeys.tasks(requestId) });
      toast.success("Task deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
