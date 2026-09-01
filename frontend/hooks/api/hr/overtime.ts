"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

export interface OvertimeRequest {
  id: number;
  userId: string;
  date: string;
  hours: string;
  reason: string | null;
  status: string;
  convertToCompOff: boolean;
  createdAt: string;
}

export interface CompOffBalance {
  earnedDays: string;
  usedDays: string;
  expiryDate: string | null;
}

export interface OvertimeRequestsResponse {
  items: OvertimeRequest[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export function useOvertimeRequests(params?: { cursor?: string; pageSize?: number }) {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "overtimeRequests", params ?? {}],
    queryFn: () =>
      apiClient.get<OvertimeRequestsResponse>(
        "/hr/overtime",
        params as Record<string, unknown> | undefined,
      ),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: hrEnabled && canView,
  });
}

export function useCreateOvertimeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "overtime", "create"],
    mutationFn: (data: { date: string; hours: string; reason?: string; convertToCompOff?: boolean }) =>
      apiClient.post<OvertimeRequest>("/hr/overtime", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "overtimeRequests"] }),
  });
}

export function useApproveOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "overtime", "approve"],
    mutationFn: (id: number) => apiClient.patch<OvertimeRequest>(`/hr/overtime/${id}/approve`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "overtimeRequests"] }),
  });
}

export function useRejectOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "overtime", "reject"],
    mutationFn: (id: number) => apiClient.patch<OvertimeRequest>(`/hr/overtime/${id}/reject`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "overtimeRequests"] }),
  });
}

export function useCompOffBalance() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...queryKeys.hr.all, "compOffBalance"],
    queryFn: () => apiClient.get<CompOffBalance[]>("/hr/overtime/comp-off"),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView,
  });
}
