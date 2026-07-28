"use client";

import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

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

interface PaginatedResult<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ListIncidentsParams {
  page?: number;
  limit?: number;
  status?: IncidentStatus;
  type?: IncidentType;
  severity?: IncidentSeverity;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export function useSafetyIncidents(params: ListIncidentsParams = {}) {
  return useQuery({
    queryKey: queryKeys.hrSafety.incidents(params),
    queryFn: () => apiClient.get<PaginatedResult<SafetyIncident>>("/hr/safety/incidents", params as Record<string, unknown>),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useSafetyIncident(id: number) {
  return useQuery({
    queryKey: queryKeys.hrSafety.incident(id),
    queryFn: () => apiClient.get<SafetyIncident>(`/hr/safety/incidents/${id}`),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useReportIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-safety", "incident", "create"],
    mutationFn: (body: {
      type: IncidentType;
      location: string;
      occurredAt: string;
      description: string;
      severity: IncidentSeverity;
      medicalAttention?: boolean;
      confidentialMedicalNote?: string;
    }) => apiClient.post<SafetyIncident>("/hr/safety/incidents", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hrSafety.all });
      toast.success("Incident reported");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateSafetyIncident(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-safety", "incident", "update", id],
    mutationFn: (body: Partial<{
      status: IncidentStatus;
      severity: IncidentSeverity;
      description: string;
      confidentialMedicalNote: string | null;
      medicalAttention: boolean;
    }>) => apiClient.patch<SafetyIncident>(`/hr/safety/incidents/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hrSafety.incident(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.hrSafety.all });
      toast.success("Incident updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteSafetyIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-safety", "incident", "delete"],
    mutationFn: (id: number) => apiClient.delete(`/hr/safety/incidents/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hrSafety.all });
      toast.success("Incident deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useSubmitCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-safety", "checkin"],
    mutationFn: (body: { date: string; score: number; flags?: string[] }) =>
      apiClient.post<WellnessCheckin>("/hr/safety/wellness/checkin", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hrSafety.wellnessAll });
      toast.success("Wellness check-in submitted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useMyCheckins(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: queryKeys.hrSafety.myCheckins(fromDate, toDate),
    queryFn: () =>
      apiClient.get<WellnessCheckin[]>("/hr/safety/wellness/my", { fromDate, toDate }),
    staleTime: 60_000,
  });
}

export function useWellnessTrend(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: queryKeys.hrSafety.wellnessTrend(fromDate, toDate),
    queryFn: () =>
      apiClient.get<WellnessTrendPoint[]>("/hr/safety/wellness/trend", { fromDate, toDate }),
    staleTime: 120_000,
  });
}

export function useBurnoutFlags() {
  return useQuery({
    queryKey: queryKeys.hrSafety.burnout,
    queryFn: () => apiClient.get<BurnoutFlag[]>("/hr/safety/wellness/burnout"),
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
  return useQuery({
    queryKey: queryKeys.hrSafety.wellnessPulse,
    queryFn: () => apiClient.get<WellnessPulse>("/hr/safety/wellness/pulse"),
    staleTime: 120_000,
    enabled,
  });
}
