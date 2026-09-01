"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export interface CalibrationEntry {
  id: number;
  orgId: string;
  cycleId: number;
  employeeId: string;
  preRating: string | null;
  postRating: string | null;
  calibratedBy: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NineBoxEntry {
  employeeId: string;
  performance: number;
  potential: number;
  box: string;
  note: string | null;
}

const keys = {
  all: ["streamlineos", "hr", "calibration"] as const,
  entries: (cycleId: number) => ["streamlineos", "hr", "calibration", "entries", cycleId] as const,
  nineBox: (cycleId: number) => ["streamlineos", "hr", "calibration", "nine-box", cycleId] as const,
};

export function useCalibrationEntries(cycleId: number) {
  const canManage = useCan("hr:performance:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: keys.entries(cycleId),
    queryFn: ({ signal }) => apiClient.get<CalibrationEntry[]>(`/hr/performance/calibration/cycles/${cycleId}/entries`, undefined, signal),
    staleTime: 30_000,
    enabled: cycleId > 0 && canManage && hrEnabled,
  });
}

export function useNineBox(cycleId: number) {
  const canManage = useCan("hr:performance:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: keys.nineBox(cycleId),
    queryFn: ({ signal }) => apiClient.get<NineBoxEntry[]>(`/hr/performance/calibration/nine-box?cycleId=${cycleId}`, undefined, signal),
    staleTime: 60_000,
    enabled: cycleId > 0 && canManage && hrEnabled,
  });
}

export function useUpsertCalibrationEntry(cycleId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "calibration", "upsert", cycleId],
    mutationFn: (body: { employeeId: string; preRating?: string; postRating?: string; note?: string }) =>
      apiClient.post<CalibrationEntry>(`/hr/performance/calibration/cycles/${cycleId}/entries`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.entries(cycleId) });
      qc.invalidateQueries({ queryKey: keys.nineBox(cycleId) });
    },
  });
}
