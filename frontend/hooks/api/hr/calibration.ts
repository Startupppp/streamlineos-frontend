"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";

const calibrationEntryListC = lazyContract(() =>
  import("@/hooks/api/hr/calibration-schema").then((m) => m.calibrationEntryListContract),
);
const calibrationEntryC = lazyContract(() =>
  import("@/hooks/api/hr/calibration-schema").then((m) => m.calibrationEntryContract),
);
const nineBoxListC = lazyContract(() =>
  import("@/hooks/api/hr/calibration-schema").then((m) => m.nineBoxListContract),
);

export interface CalibrationEntry {
  id: number;
  orgId: string;
  cycleId: number | null;
  userId: string;
  performanceScore: string | null;
  potentialScore: string | null;
  box: string | null;
  calibratedBy: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NineBoxEntry {
  employeeId: string;
  performance: string | null;
  potential: string | null;
  box: string | null;
  note: string | null;
}

const keys = {
  all: [...queryKeyBase, "hr", "calibration"] as const,
  entries: (cycleId: number) => [...queryKeyBase, "hr", "calibration", "entries", cycleId] as const,
  nineBox: (cycleId: number) => [...queryKeyBase, "hr", "calibration", "nine-box", cycleId] as const,
};

export function useCalibrationEntries(cycleId: number) {
  const canManage = useCan("hr:performance:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: keys.entries(cycleId),
    queryFn: ({ signal }) => apiClient.get<CalibrationEntry[]>(`/hr/performance/calibration/cycles/${cycleId}/entries`, undefined, signal, calibrationEntryListC),
    staleTime: 30_000,
    enabled: cycleId > 0 && canManage && hrEnabled,
  });
}

export function useNineBox(cycleId: number) {
  const canManage = useCan("hr:performance:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: keys.nineBox(cycleId),
    queryFn: ({ signal }) => apiClient.get<NineBoxEntry[]>(`/hr/performance/calibration/nine-box?cycleId=${cycleId}`, undefined, signal, nineBoxListC),
    staleTime: 60_000,
    enabled: cycleId > 0 && canManage && hrEnabled,
  });
}

export function useUpsertCalibrationEntry(cycleId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:performance:manage", {
    mutationKey: ["hr", "calibration", "upsert", cycleId],
    mutationFn: (body: { userId: string; performanceScore?: string; potentialScore?: string; box?: string; note?: string }) =>
      apiClient.post<CalibrationEntry>(`/hr/performance/calibration/cycles/${cycleId}/entries`, body, undefined, calibrationEntryC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.entries(cycleId) });
      qc.invalidateQueries({ queryKey: keys.nineBox(cycleId) });
    },
  });
}
