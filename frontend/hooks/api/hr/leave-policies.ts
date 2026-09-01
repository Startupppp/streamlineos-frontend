import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

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
  const canView = useCan("hr:leaves:view");
  return useQuery<LeavePolicy[]>({
    queryKey: queryKeys.hr.leavePolicies(),
    queryFn: ({ signal }) => apiClient.get<LeavePolicy[]>("/hr/leave-policies", undefined, signal),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCreateLeavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "leave-policies", "create"],
    mutationFn: (data: CreateLeavePolicyInput) =>
      apiClient.post<LeavePolicy>("/hr/leave-policies", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.leavePolicies() }),
  });
}

export function useUpdateLeavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "leave-policies", "update"],
    mutationFn: ({ id, ...data }: Partial<CreateLeavePolicyInput> & { id: number }) =>
      apiClient.patch<LeavePolicy>(`/hr/leave-policies/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.leavePolicies() }),
  });
}

export function useDeleteLeavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "leave-policies", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/hr/leave-policies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.hr.leavePolicies() }),
  });
}
