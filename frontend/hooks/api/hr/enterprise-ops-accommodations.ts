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
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export interface ListAccommodationsParams {
  cursor?: string;
  limit?: number;
  userId?: string;
  status?: AccommodationStatus;
  type?: AccommodationType;
}

const BASE = "/hr/enterprise/ops/accommodations";

const accKeys = {
  all: ["streamlineos", "hr-accommodations"] as const,
  list: (p: ListAccommodationsParams) => ["streamlineos", "hr-accommodations", "list", p] as const,
  detail: (id: string) => ["streamlineos", "hr-accommodations", "detail", id] as const,
  tasks: (id: string) => ["streamlineos", "hr-accommodations", "tasks", id] as const,
};

export function useAccommodations(params: ListAccommodationsParams = {}) {
  return useQuery({
    queryKey: accKeys.list(params),
    queryFn: ({ signal }) => apiClient.get<PaginatedResult<AccommodationRequest>>(BASE, params as Record<string, unknown>),
    staleTime: 30_000,
  });
}

export function useAccommodation(id: string) {
  return useQuery({
    queryKey: accKeys.detail(id),
    queryFn: ({ signal }) => apiClient.get<AccommodationRequest>(`${BASE}/${id}`, undefined, signal),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useAccommodationTasks(requestId: string) {
  return useQuery({
    queryKey: accKeys.tasks(requestId),
    queryFn: ({ signal }) => apiClient.get<AccommodationTask[]>(`${BASE}/${requestId}/tasks`, undefined, signal),
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

