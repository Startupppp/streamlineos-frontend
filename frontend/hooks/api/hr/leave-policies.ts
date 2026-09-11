import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";

const leavePoliciesListC = lazyContract(() =>
  import("@/hooks/api/hr/leave-policies-schema").then((m) => m.leavePoliciesListContract),
);
const createLeavePolicyC = lazyContract(() =>
  import("@/hooks/api/hr/leave-policies-schema").then((m) => m.createLeavePolicyContract),
);
const updateLeavePolicyC = lazyContract(() =>
  import("@/hooks/api/hr/leave-policies-schema").then((m) => m.updateLeavePolicyContract),
);
const deleteLeavePolicyC = lazyContract(() =>
  import("@/hooks/api/hr/leave-policies-schema").then((m) => m.deleteLeavePolicyContract),
);

export interface LeavePolicy {
  id: number;
  orgId: string;
  leaveTypeId: number;
  name: string;
  accrualType: string;
  accrualRate: string;
  maxBalance?: string | null;
  carryForwardDays: string;
  carryForwardExpiryMonths?: number | null;
  encashable: boolean;
  probationRestricted: boolean;
  genderRestriction?: string | null;
  appliesTo: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
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
    queryKey: humanResourcesQueryKeys.hr.leavePolicies(),
    queryFn: ({ signal }) => apiClient.get<LeavePolicy[]>("/hr/leave-policies", undefined, signal, leavePoliciesListC),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCreateLeavePolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leave-policies", "create"],
    mutationFn: (data: CreateLeavePolicyInput) =>
      apiClient.post<LeavePolicy>("/hr/leave-policies", data, undefined, createLeavePolicyC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.leavePolicies() }),
  });
}

export function useUpdateLeavePolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leave-policies", "update"],
    mutationFn: ({ id, ...data }: Partial<CreateLeavePolicyInput> & { id: number }) =>
      apiClient.patch<LeavePolicy>(`/hr/leave-policies/${id}`, data, undefined, updateLeavePolicyC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.leavePolicies() }),
  });
}

export function useDeleteLeavePolicy() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leave-policies", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<void>(`/hr/leave-policies/${id}`, undefined, undefined, deleteLeavePolicyC),
    onSuccess: () => qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.leavePolicies() }),
  });
}
