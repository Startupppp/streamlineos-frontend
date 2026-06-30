"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  return useQuery({
    queryKey: [...queryKeys.hr.all, "shifts"],
    queryFn: () => apiClient.get<ShiftTemplate[]>("/hr/shifts"),
    staleTime: 2 * 60_000,
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "shifts", "create"],
    mutationFn: (data: { name: string; type: string; startTime: string; endTime: string; breakMinutes?: number; isNightShift?: boolean; gracePeriodMinutes?: number }) =>
      apiClient.post<ShiftTemplate>("/hr/shifts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "shifts"] }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "shifts", "update"],
    mutationFn: ({ id, ...data }: { id: number; name?: string; type?: string; startTime?: string; endTime?: string; breakMinutes?: number; isNightShift?: boolean; gracePeriodMinutes?: number }) =>
      apiClient.patch<ShiftTemplate>(`/hr/shifts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "shifts"] }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "shifts", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "shifts"] }),
  });
}

export function useShiftAssignments() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "shiftAssignments"],
    queryFn: () => apiClient.get<ShiftAssignment[]>("/hr/shifts/assignments"),
    staleTime: 2 * 60_000,
  });
}

export function useAssignShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "shifts", "assign"],
    mutationFn: (data: { userId: string; shiftId: number; effectiveFrom: string; effectiveTo?: string }) =>
      apiClient.post<ShiftAssignment>("/hr/shifts/assignments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "shiftAssignments"] }),
  });
}

export function useShiftSwaps() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "shiftSwaps"],
    queryFn: () => apiClient.get<ShiftSwap[]>("/hr/shifts/swaps"),
    staleTime: 30_000,
  });
}

export function useCreateSwapRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "shifts", "swap"],
    mutationFn: (data: { targetUserId: string; requestDate: string; targetDate: string; reason?: string }) =>
      apiClient.post<ShiftSwap>("/hr/shifts/swaps", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "shiftSwaps"] }),
  });
}

export function useUpdateSwapStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "shifts", "swapStatus"],
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiClient.patch<ShiftSwap>(`/hr/shifts/swaps/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "shiftSwaps"] }),
  });
}
