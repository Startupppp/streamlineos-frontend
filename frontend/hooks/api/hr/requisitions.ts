"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";

const requisitionsListC = lazyContract(() =>
  import("@/hooks/api/hr/requisitions-schema").then((m) => m.requisitionsListContract),
);
const createRequisitionC = lazyContract(() =>
  import("@/hooks/api/hr/requisitions-schema").then((m) => m.createRequisitionContract),
);
const submitRequisitionC = lazyContract(() =>
  import("@/hooks/api/hr/requisitions-schema").then((m) => m.submitRequisitionContract),
);
const approveRequisitionC = lazyContract(() =>
  import("@/hooks/api/hr/requisitions-schema").then((m) => m.approveRequisitionContract),
);
const rejectRequisitionC = lazyContract(() =>
  import("@/hooks/api/hr/requisitions-schema").then((m) => m.rejectRequisitionContract),
);
const createJobFromRequisitionC = lazyContract(() =>
  import("@/hooks/api/hr/requisitions-schema").then((m) => m.createJobFromRequisitionContract),
);

export interface JobRequisition {
  id: number;
  orgId: string;
  title: string;
  department?: string | null;
  location?: string | null;
  headcount: number;
  budgetMin?: string | null;
  budgetMax?: string | null;
  hiringManagerId?: string | null;
  priority: string;
  type: string;
  status: string;
  requestedBy: string;
  approverId?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  justification?: string | null;
  targetDate?: string | null;
  headcountId?: number | null;
  linkedJobId?: number | null;
  createdAt: string;
}

export function useJobRequisitions(status?: string) {
  const canRequisitions = useCan("hr:requisitions:view");
  return useQuery<JobRequisition[]>({
    queryKey: humanResourcesQueryKeys.hr.requisitions(status),
    queryFn: ({ signal }) => apiClient.get<JobRequisition[]>("/hr/recruitment/requisitions", status ? { status } : undefined, signal, requisitionsListC),
    staleTime: 60_000,
    enabled: canRequisitions,
  });
}

export interface CreateJobRequisitionInput {
  title: string;
  department?: string | null;
  location?: string | null;
  headcount: number;
  budgetMin?: number;
  budgetMax?: number;
  priority: string;
  type: string;
  justification?: string | null;
  targetDate?: string | null;
  headcountId?: number | null;
  hiringManagerId?: string | null;
}

export function useCreateJobRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "create"],
    mutationFn: (data: CreateJobRequisitionInput) =>
      apiClient.post<JobRequisition>("/hr/recruitment/requisitions", data, undefined, createRequisitionC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useSubmitRequisition() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "submit"],
    mutationFn: (requisitionId: number, idempotencyKey: string) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${requisitionId}/submit`, undefined, { headers: { "Idempotency-Key": idempotencyKey } }, submitRequisitionC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useApproveRequisition() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "approve"],
    mutationFn: (requisitionId: number, idempotencyKey: string) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${requisitionId}/approve`, undefined, { headers: { "Idempotency-Key": idempotencyKey } }, approveRequisitionC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useRejectRequisition() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "reject"],
    mutationFn: ({ requisitionId, reason }: { requisitionId: number; reason: string }, idempotencyKey: string) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${requisitionId}/reject`, { reason }, { headers: { "Idempotency-Key": idempotencyKey } }, rejectRequisitionC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useCreateJobFromRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "create-job"],
    mutationFn: (requisitionId: number) =>
      apiClient.post<{ jobId: number; jobTitle: string }>(`/hr/recruitment/requisitions/${requisitionId}/create-job`, undefined, undefined, createJobFromRequisitionC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}
