"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeyBase } from "@/lib/query-keys/base";

export type AccommodationType = "equipment" | "schedule" | "workspace" | "medical_restriction" | "other";
export type AccommodationStatus = "requested" | "under_review" | "approved" | "denied" | "implemented";
export type AccommodationTaskStatus = "pending" | "in_progress" | "completed";

export interface AccommodationRequest {
  id: string;
  orgId: string;
  userId: string;
  userMembershipId: number | null;
  type: AccommodationType;
  description: string;
  confidentialMedicalNote: string | null;
  status: AccommodationStatus;
  reviewedBy: string | null;
  reviewDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AccommodationTask {
  id: string;
  orgId: string;
  requestId: string;
  title: string;
  assigneeUserId: string | null;
  assigneeMembershipId: number | null;
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
  all: [...queryKeyBase, "hr-accommodations"] as const,
  list: (p: ListAccommodationsParams) => [...queryKeyBase, "hr-accommodations", "list", p] as const,
  detail: (id: string) => [...queryKeyBase, "hr-accommodations", "detail", id] as const,
  tasks: (id: string) => [...queryKeyBase, "hr-accommodations", "tasks", id] as const,
};

const _listAccommodationsContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.listAccommodationsContract),
);
const _getAccommodationContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.getAccommodationContract),
);
const _listAccommodationTasksContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.listAccommodationTasksContract),
);
const _createAccommodationContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.createAccommodationContract),
);
const _approveAccommodationContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.approveAccommodationContract),
);

export function useAccommodations(params: ListAccommodationsParams = {}) {
  return useGatedQuery("hr:accommodations:view", {
    queryKey: accKeys.list(params),
    queryFn: ({ signal }) => apiClient.get("/hr/enterprise/ops/accommodations", params, signal, _listAccommodationsContract),
    staleTime: 30_000,
  });
}

export function useAccommodation(accommodationId: string) {
  return useGatedQuery("hr:accommodations:view", {
    queryKey: accKeys.detail(accommodationId),
    queryFn: ({ signal }) => apiClient.get(`${BASE}/${accommodationId}`, undefined, signal, _getAccommodationContract),
    enabled: !!accommodationId,
    staleTime: 30_000,
  });
}

export function useAccommodationTasks(requestId: string) {
  return useGatedQuery("hr:accommodations:view", {
    queryKey: accKeys.tasks(requestId),
    queryFn: ({ signal }) => apiClient.get(`${BASE}/${requestId}/tasks`, undefined, signal, _listAccommodationTasksContract),
    enabled: !!requestId,
    staleTime: 30_000,
  });
}

export function useCreateAccommodation() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:accommodations:manage", {
    mutationKey: ["hr-accommodations", "create"],
    mutationFn: (body: {
      userId: string;
      type: AccommodationType;
      description: string;
      confidentialMedicalNote?: string;
    }) => apiClient.post("/hr/enterprise/ops/accommodations", body, undefined, _createAccommodationContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accKeys.all });
      toast.success("Accommodation request created");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useApproveAccommodation(accommodationId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:accommodations:manage", {
    mutationKey: ["hr-accommodations", "approve", accommodationId],
    mutationFn: (body: {
      note?: string;
      tasks?: Array<{ title: string; assigneeUserId?: string; dueDate?: string }>;
    }) => apiClient.post(`${BASE}/${accommodationId}/approve`, body, undefined, _approveAccommodationContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: accKeys.all });
      toast.success("Accommodation approved");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
