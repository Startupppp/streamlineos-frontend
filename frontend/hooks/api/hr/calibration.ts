"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { queryKeyBase } from "@/lib/query-keys/base";
import type {
  calibrationEntryContract,
  nineBoxEntryContract,
} from "@/hooks/api/hr/calibration-schema";

const calibrationEntryListC = lazyContract(() =>
  import("@/hooks/api/hr/calibration-schema").then((m) => m.calibrationEntryListContract),
);
const calibrationEntryC = lazyContract(() =>
  import("@/hooks/api/hr/calibration-schema").then((m) => m.calibrationEntryContract),
);
const nineBoxListC = lazyContract(() =>
  import("@/hooks/api/hr/calibration-schema").then((m) => m.nineBoxListContract),
);

export type CalibrationEntry = z.infer<typeof calibrationEntryContract>;

export type NineBoxEntry = z.infer<typeof nineBoxEntryContract>;

export interface UpsertCalibrationEntryInput {
  employeeId: string;
  preRating: string;
  postRating: string;
  note?: string;
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
    mutationFn: (body: UpsertCalibrationEntryInput) =>
      apiClient.post<CalibrationEntry>(`/hr/performance/calibration/cycles/${cycleId}/entries`, body, undefined, calibrationEntryC),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.entries(cycleId) });
      qc.invalidateQueries({ queryKey: keys.nineBox(cycleId) });
    },
  });
}
