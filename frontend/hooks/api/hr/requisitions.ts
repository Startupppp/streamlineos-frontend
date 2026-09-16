"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  budgetMin?: string;
  budgetMax?: string;
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

export function useCreateJobRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "create"],
    mutationFn: (data: Omit<JobRequisition, "id" | "orgId" | "requestedBy" | "status" | "createdAt">) =>
      apiClient.post<JobRequisition>("/hr/recruitment/requisitions", data, undefined, createRequisitionC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useSubmitRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "submit"],
    mutationFn: (requisitionId: number) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${requisitionId}/submit`, undefined, undefined, submitRequisitionC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useApproveRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "approve"],
    mutationFn: (requisitionId: number) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${requisitionId}/approve`, undefined, undefined, approveRequisitionC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useRejectRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "reject"],
    mutationFn: ({ requisitionId, reason }: { requisitionId: number; reason: string }) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${requisitionId}/reject`, { reason }, undefined, rejectRequisitionC),
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
