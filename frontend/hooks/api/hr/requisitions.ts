import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";

export interface JobRequisition {
  id: number;
  orgId: string;
  title: string;
  department?: string;
  location?: string;
  headcount: number;
  budgetMin?: string;
  budgetMax?: string;
  hiringManagerId?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  type: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PUBLISHED" | "CLOSED" | "REJECTED";
  requestedBy: string;
  approverId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  justification?: string;
  targetDate?: string;
  linkedJobId?: number;
  createdAt: string;
}

export function useJobRequisitions(status?: string) {
  const canRequisitions = useCan("hr:requisitions:view");
  return useQuery<JobRequisition[]>({
    queryKey: humanResourcesQueryKeys.hr.requisitions(status),
    queryFn: ({ signal }) => apiClient.get<JobRequisition[]>("/hr/recruitment/requisitions", status ? { status } : undefined, signal),
    staleTime: 60_000,
    enabled: canRequisitions,
  });
}

export function useCreateJobRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "create"],
    mutationFn: (data: Omit<JobRequisition, "id" | "orgId" | "requestedBy" | "status" | "createdAt">) =>
      apiClient.post<JobRequisition>("/hr/recruitment/requisitions", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useSubmitRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "submit"],
    mutationFn: (id: number) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${id}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useApproveRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "approve"],
    mutationFn: (id: number) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useRejectRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "reject"],
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}

export function useCreateJobFromRequisition() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "requisitions", "create-job"],
    mutationFn: (id: number) =>
      apiClient.post<{ jobId: number; jobTitle: string }>(`/hr/recruitment/requisitions/${id}/create-job`),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.requisitions() }),
  });
}
