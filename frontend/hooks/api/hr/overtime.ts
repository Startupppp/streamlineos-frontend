"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

const overtimeListC = lazyContract(() =>
  import("@/hooks/api/hr/overtime-schema").then((m) => m.overtimeListContract),
);
const createOvertimeC = lazyContract(() =>
  import("@/hooks/api/hr/overtime-schema").then((m) => m.createOvertimeContract),
);
const approveOvertimeC = lazyContract(() =>
  import("@/hooks/api/hr/overtime-schema").then((m) => m.approveOvertimeContract),
);
const rejectOvertimeC = lazyContract(() =>
  import("@/hooks/api/hr/overtime-schema").then((m) => m.rejectOvertimeContract),
);
const compOffBalanceC = lazyContract(() =>
  import("@/hooks/api/hr/overtime-schema").then((m) => m.compOffBalanceContract),
);

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
    queryKey: [...humanResourcesQueryKeys.hr.all, "overtimeRequests", params ?? {}],
    queryFn: ({ signal }) =>
      apiClient.get<OvertimeRequestsResponse>(
        "/hr/overtime",
        params as Record<string, unknown> | undefined, signal, overtimeListC,
      ),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: hrEnabled && canView,
  });
}

export function useCreateOvertimeRequest() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:view", {
    mutationKey: ["hr", "overtime", "create"],
    mutationFn: (data: { date: string; hours: string; reason?: string; convertToCompOff?: boolean }) =>
      apiClient.post<OvertimeRequest>("/hr/overtime", data, undefined, createOvertimeC),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "overtimeRequests"] }),
  });
}

export function useApproveOvertime() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "overtime", "approve"],
    mutationFn: (id: number) => apiClient.patch<OvertimeRequest>(`/hr/overtime/${id}/approve`, {}, undefined, approveOvertimeC),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "overtimeRequests"] }),
  });
}

export function useRejectOvertime() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:attendance:manage", {
    mutationKey: ["hr", "overtime", "reject"],
    mutationFn: (id: number) => apiClient.patch<OvertimeRequest>(`/hr/overtime/${id}/reject`, {}, undefined, rejectOvertimeC),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "overtimeRequests"] }),
  });
}

export function useCompOffBalance() {
  const canView = useCan("hr:attendance:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "compOffBalance"],
    queryFn: ({ signal }) => apiClient.get<CompOffBalance[]>("/hr/overtime/comp-off", undefined, signal, compOffBalanceC),
    staleTime: 2 * 60_000,
    enabled: hrEnabled && canView,
  });
}
