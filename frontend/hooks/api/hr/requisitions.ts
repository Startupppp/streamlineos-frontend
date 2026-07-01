import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
  createdAt: string;
}

export function useJobRequisitions(status?: string) {
  return useQuery<JobRequisition[]>({
    queryKey: ["hr", "requisitions", status],
    queryFn: () => apiClient.get<JobRequisition[]>("/hr/recruitment/requisitions", status ? { status } : undefined),
    staleTime: 60_000,
  });
}

export function useCreateJobRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "requisitions", "create"],
    mutationFn: (data: Omit<JobRequisition, "id" | "orgId" | "requestedBy" | "status" | "createdAt">) =>
      apiClient.post<JobRequisition>("/hr/recruitment/requisitions", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "requisitions"] }),
  });
}

export function useSubmitRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "requisitions", "submit"],
    mutationFn: (id: number) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${id}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "requisitions"] }),
  });
}

export function useApproveRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "requisitions", "approve"],
    mutationFn: (id: number) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "requisitions"] }),
  });
}

export function useRejectRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "requisitions", "reject"],
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiClient.patch<JobRequisition>(`/hr/recruitment/requisitions/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "requisitions"] }),
  });
}
