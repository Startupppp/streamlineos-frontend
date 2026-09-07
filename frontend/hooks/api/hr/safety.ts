"use client";

import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useGatedQuery } from "@/hooks/api/gated-query";

const incidentListContract = lazyContract(() =>
  import("@/hooks/api/hr/safety-schema").then((m) => m.safetyIncidentListContract),
);
const incidentContract = lazyContract(() =>
  import("@/hooks/api/hr/safety-schema").then((m) => m.safetyIncidentContract),
);
const checkinContract = lazyContract(() =>
  import("@/hooks/api/hr/safety-schema").then((m) => m.wellnessCheckinContract),
);
const checkinListContract = lazyContract(() =>
  import("@/hooks/api/hr/safety-schema").then((m) => m.wellnessCheckinListContract),
);
const trendListContract = lazyContract(() =>
  import("@/hooks/api/hr/safety-schema").then((m) => m.wellnessTrendListContract),
);
const burnoutListContract = lazyContract(() =>
  import("@/hooks/api/hr/safety-schema").then((m) => m.burnoutFlagListContract),
);
const pulseContract = lazyContract(() =>
  import("@/hooks/api/hr/safety-schema").then((m) => m.wellnessPulseContract),
);

export type IncidentType = "injury" | "accident" | "near_miss" | "hazard" | "environmental" | "other";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "investigating" | "mitigated" | "closed";

export interface SafetyIncident {
  id: number;
  incidentNumber: string;
  type: IncidentType;
  location: string;
  occurredAt: string;
  reportedBy: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  medicalAttention: boolean;
  confidentialMedicalNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WellnessCheckin {
  id: number;
  userId: string;
  date: string;
  score: number;
  flags: string[] | null;
  createdAt: string;
}

export interface WellnessTrendPoint {
  date: string;
  avgScore: number | null;
  respondents: number;
}

export interface BurnoutFlag {
  userId: string;
  avgScore: number;
  checkCount: number;
}

interface CursorPage<T> {
  data: T[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export type ListIncidentsParams = {
  cursor?: string;
  limit?: number;
  status?: IncidentStatus;
  type?: IncidentType;
  severity?: IncidentSeverity;
  search?: string;
  fromDate?: string;
  toDate?: string;
};

export function useSafetyIncidents(params: ListIncidentsParams = {}) {
  return useGatedQuery("hr:safety:view", {
    queryKey: directoryAndOwnershipQueryKeys.hrSafety.incidents(params),
    queryFn: ({ signal }) => apiClient.get("/hr/safety/incidents", params, signal, incidentListContract),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useReportIncident() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:safety:manage", {
    mutationKey: ["hr-safety", "incident", "create"],
    mutationFn: (body: {
      type: IncidentType;
      location: string;
      occurredAt: string;
      description: string;
      severity: IncidentSeverity;
      medicalAttention?: boolean;
      confidentialMedicalNote?: string;
    }) => apiClient.post("/hr/safety/incidents", body, undefined, incidentContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.hrSafety.all });
      toast.success("Incident reported");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useSubmitCheckin() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:safety:view", {
    mutationKey: ["hr-safety", "checkin"],
    mutationFn: (body: { date: string; score: number; flags?: string[] }) =>
      apiClient.post("/hr/safety/wellness/checkin", body, undefined, checkinContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.hrSafety.wellnessAll });
      toast.success("Wellness check-in submitted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useMyCheckins(fromDate?: string, toDate?: string) {
  return useGatedQuery("hr:safety:view", {
    queryKey: directoryAndOwnershipQueryKeys.hrSafety.myCheckins(fromDate, toDate),
    queryFn: ({ signal }) =>
      apiClient.get("/hr/safety/wellness/my", { fromDate, toDate }, signal, checkinListContract),
    staleTime: 60_000,
  });
}

export function useWellnessTrend(fromDate?: string, toDate?: string) {
  return useGatedQuery("hr:safety:manage", {
    queryKey: directoryAndOwnershipQueryKeys.hrSafety.wellnessTrend(fromDate, toDate),
    queryFn: ({ signal }) =>
      apiClient.get("/hr/safety/wellness/trend", { fromDate, toDate }, signal, trendListContract),
    staleTime: 120_000,
  });
}

export function useBurnoutFlags() {
  return useGatedQuery("hr:safety:manage", {
    queryKey: directoryAndOwnershipQueryKeys.hrSafety.burnout,
    queryFn: ({ signal }) => apiClient.get("/hr/safety/wellness/burnout", undefined, signal, burnoutListContract),
    staleTime: 120_000,
  });
}

export interface WellnessPulse {
  mode: "k_anonymized_pulse";
  honestyNote: string;
  windowDays: number;
  minGroupSize: number;
  suppressed: boolean;
  respondents: number | null;
  avgScore: number | null;
  checkins: number | null;
  burnoutThreshold: number;
}

export function useWellnessPulse(enabled = true) {
  return useGatedQuery("hr:safety:manage", {
    queryKey: directoryAndOwnershipQueryKeys.hrSafety.wellnessPulse,
    queryFn: ({ signal }) => apiClient.get("/hr/safety/wellness/pulse", undefined, signal, pulseContract),
    staleTime: 120_000,
    enabled,
  });
}
