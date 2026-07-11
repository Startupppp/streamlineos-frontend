"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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
  all: ["hr", "calibration"] as const,
  entries: (cycleId: number) => ["hr", "calibration", "entries", cycleId] as const,
  nineBox: (cycleId: number) => ["hr", "calibration", "nine-box", cycleId] as const,
};

export function useCalibrationEntries(cycleId: number) {
  return useQuery({
    queryKey: keys.entries(cycleId),
    queryFn: () => apiClient.get<CalibrationEntry[]>(`/hr/performance/calibration/cycles/${cycleId}/entries`),
    staleTime: 30_000,
    enabled: cycleId > 0,
  });
}

export function useNineBox(cycleId: number) {
  return useQuery({
    queryKey: keys.nineBox(cycleId),
    queryFn: () => apiClient.get<NineBoxEntry[]>(`/hr/performance/calibration/nine-box?cycleId=${cycleId}`),
    staleTime: 60_000,
    enabled: cycleId > 0,
  });
}

export function useUpsertCalibrationEntry(cycleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { employeeId: string; preRating?: string; postRating?: string; note?: string }) =>
      apiClient.post<CalibrationEntry>(`/hr/performance/calibration/cycles/${cycleId}/entries`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.entries(cycleId) });
      qc.invalidateQueries({ queryKey: keys.nineBox(cycleId) });
    },
  });
}
