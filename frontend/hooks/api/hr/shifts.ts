"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

const shiftListContract = lazyContract(() =>
  import("@/hooks/api/hr/shifts-schema").then((m) => m.shiftTemplateListContract),
);
const shiftRowContract = lazyContract(() =>
  import("@/hooks/api/hr/shifts-schema").then((m) => m.shiftTemplateContract),
);
const shiftAssignmentListContract = lazyContract(() =>
  import("@/hooks/api/hr/shifts-schema").then((m) => m.shiftAssignmentListContract),
);
const shiftSwapListContract = lazyContract(() =>
  import("@/hooks/api/hr/shifts-schema").then((m) => m.shiftSwapListContract),
);
const shiftSwapRowContract = lazyContract(() =>
  import("@/hooks/api/hr/shifts-schema").then((m) => m.shiftSwapContract),
);
const shiftDeleteContract = lazyContract(() =>
  import("@/hooks/api/hr/shifts-schema").then((m) => m.shiftDeleteContract),
);

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
    queryFn: ({ signal }) => apiClient.get("/hr/shifts", undefined, signal, shiftListContract),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "shifts", "create"],
    mutationFn: (data: { name: string; type: string; startTime: string; endTime: string; breakMinutes?: number; isNightShift?: boolean; gracePeriodMinutes?: number }) =>
      apiClient.post("/hr/shifts", data, undefined, shiftRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "shifts"] }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "shifts", "update"],
    mutationFn: ({ shiftId, ...data }: { shiftId: number; name?: string; type?: string; startTime?: string; endTime?: string; breakMinutes?: number; isNightShift?: boolean; gracePeriodMinutes?: number }) =>
      apiClient.patch(`/hr/shifts/${shiftId}`, data, undefined, shiftRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "shifts"] }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "shifts", "delete"],
    mutationFn: (shiftId: number) => apiClient.delete(`/hr/shifts/${shiftId}`, undefined, undefined, shiftDeleteContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "shifts"] }),
  });
}

export function useShiftAssignments() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "shiftAssignments"],
    queryFn: ({ signal }) => apiClient.get("/hr/shifts/assignments", undefined, signal, shiftAssignmentListContract),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView,
  });
}

export function useShiftSwaps() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "shiftSwaps"],
    queryFn: ({ signal }) => apiClient.get("/hr/shifts/swaps", undefined, signal, shiftSwapListContract),
    staleTime: 30_000,
    enabled: hrEnabled && canView,
  });
}

export function useUpdateSwapStatus() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "shifts", "swapStatus"],
    mutationFn: ({ swapId, status }: { swapId: number; status: string }) =>
      apiClient.patch(`/hr/shifts/swaps/${swapId}`, { status }, undefined, shiftSwapRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "shiftSwaps"] }),
  });
}
