"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

export interface ShiftTemplate {
  id: number;
  orgId: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isNightShift: boolean;
  gracePeriodMinutes: number;
  isActive: boolean;
  createdAt: string;
}

export interface ShiftAssignment {
  id: number;
  userId: string;
  shiftId: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface ShiftSwap {
  id: number;
  requesterId: string;
  targetUserId: string;
  requestDate: string;
  targetDate: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

export function useHrShifts() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "shifts"],
    queryFn: ({ signal }) => apiClient.get<ShiftTemplate[]>("/hr/shifts", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "shifts", "create"],
    mutationFn: (data: { name: string; type: string; startTime: string; endTime: string; breakMinutes?: number; isNightShift?: boolean; gracePeriodMinutes?: number }) =>
      apiClient.post<ShiftTemplate>("/hr/shifts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "shifts"] }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "shifts", "update"],
    mutationFn: ({ id, ...data }: { id: number; name?: string; type?: string; startTime?: string; endTime?: string; breakMinutes?: number; isNightShift?: boolean; gracePeriodMinutes?: number }) =>
      apiClient.patch<ShiftTemplate>(`/hr/shifts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "shifts"] }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "shifts", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "shifts"] }),
  });
}

export function useShiftAssignments() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "shiftAssignments"],
    queryFn: ({ signal }) => apiClient.get<ShiftAssignment[]>("/hr/shifts/assignments", undefined, signal),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useShiftSwaps() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "shiftSwaps"],
    queryFn: ({ signal }) => apiClient.get<ShiftSwap[]>("/hr/shifts/swaps", undefined, signal),
    staleTime: 30_000,
    enabled: hrEnabled && canView,
  });
}

export function useUpdateSwapStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "shifts", "swapStatus"],
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiClient.patch<ShiftSwap>(`/hr/shifts/swaps/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "shiftSwaps"] }),
  });
}
