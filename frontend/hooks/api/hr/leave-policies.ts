import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface LeavePolicy {
  id: number;
  orgId: string;
  leaveTypeId: number;
  name: string;
  accrualType: string;
  accrualRate: string;
  maxBalance?: string;
  carryForwardDays: string;
  carryForwardExpiryMonths?: number;
  encashable: boolean;
  probationRestricted: boolean;
  genderRestriction?: string;
  appliesTo: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
}

interface CreateLeavePolicyInput {
  leaveTypeId: number;
  name: string;
  accrualType?: string;
  accrualRate: string;
  maxBalance?: string;
  carryForwardDays?: string;
  encashable?: boolean;
  probationRestricted?: boolean;
  appliesTo?: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export function useLeavePolicies() {
  return useQuery<LeavePolicy[]>({
    queryKey: ["hr", "leave-policies"],
    queryFn: () => apiClient.get("/hr/leave-policies").then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useCreateLeavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "leave-policies", "create"],
    mutationFn: (data: CreateLeavePolicyInput) =>
      apiClient.post("/hr/leave-policies", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "leave-policies"] }),
  });
}

export function useUpdateLeavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "leave-policies", "update"],
    mutationFn: ({ id, ...data }: Partial<CreateLeavePolicyInput> & { id: number }) =>
      apiClient.patch(`/hr/leave-policies/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "leave-policies"] }),
  });
}

export function useDeleteLeavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "leave-policies", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete(`/hr/leave-policies/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "leave-policies"] }),
  });
}
