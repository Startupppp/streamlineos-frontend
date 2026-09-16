"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  createLeaveTypeC,
  deleteLeaveTypeC,
  seedLeaveTypesC,
  updateLeaveTypeC,
} from "@/hooks/api/hr/leaves-contracts";
import {
  LEAVE_TYPES_KEY,
  leaveContextKey,
  useLeaveQueryIdentity,
} from "@/hooks/api/hr/leaves-query-identity";
import type { HrLeaveType } from "@/hooks/api/hr/leaves-types";

export function useSeedLeaveTypes() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leaves", "seed-types"],
    mutationFn: () =>
      apiClient.post<{ seeded: number; skipped: number }>("/hr/leaves/types/seed-defaults", undefined, undefined, seedLeaveTypesC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
    },
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leaves", "update-type"],
    mutationFn: ({ typeId, ...patch }: { typeId: number; name?: string; daysPerYear?: number; carryForward?: boolean }) =>
      apiClient.patch<HrLeaveType>(`/hr/leaves/types/${typeId}`, patch, undefined, updateLeaveTypeC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
    },
  });
}

export function useDeleteLeaveType() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leaves", "delete-type"],
    mutationFn: (typeId: number) => apiClient.delete<{ success: boolean }>(`/hr/leaves/types/${typeId}`, undefined, undefined, deleteLeaveTypeC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
    },
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  const identity = useLeaveQueryIdentity();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leaves", "create-type"],
    mutationFn: (data: { name: string; daysPerYear: number; carryForward?: boolean }) =>
      apiClient.post<{ id: number; name: string; daysPerYear: number }>(
        "/hr/leaves/types",
        data,
        undefined,
        createLeaveTypeC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
      void qc.invalidateQueries({ queryKey: leaveContextKey(identity) });
    },
  });
}
