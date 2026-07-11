"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

export type EmergencyEventType = "office_closure" | "disaster" | "safety_check" | "other";
export type EmergencyEventStatus = "active" | "resolved";
export type EmergencyResponseStatus = "safe" | "need_help" | "no_response";

export interface EmergencyEvent {
  id: string;
  orgId: string;
  name: string;
  type: EmergencyEventType;
  locationId: string | null;
  status: EmergencyEventStatus;
  message: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface EmergencyResponse {
  id: string;
  eventId: string;
  userId: string;
  status: EmergencyResponseStatus;
  respondedAt: string | null;
  note: string | null;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const BASE = "/hr/enterprise/ops/emergency";

const emergencyKeys = {
  all: ["hr-emergency"] as const,
  list: (p: Record<string, unknown>) => ["hr-emergency", "list", p] as const,
  detail: (id: string) => ["hr-emergency", "detail", id] as const,
  status: (id: string) => ["hr-emergency", "status", id] as const,
};

export function useEmergencyEvents(params: { page?: number; status?: EmergencyEventStatus } = {}) {
  return useQuery({
    queryKey: emergencyKeys.list(params as Record<string, unknown>),
    queryFn: () => apiClient.get<PaginatedResult<EmergencyEvent>>(`${BASE}/events`, params as Record<string, unknown>),
    staleTime: 30_000,
  });
}

export function useEmergencyEvent(eventId: string) {
  return useQuery({
    queryKey: emergencyKeys.detail(eventId),
    queryFn: () => apiClient.get<EmergencyEvent>(`${BASE}/events/${eventId}`),
    enabled: !!eventId,
    staleTime: 15_000,
  });
}

export function useEmergencyEventStatus(eventId: string) {
  return useQuery({
    queryKey: emergencyKeys.status(eventId),
    queryFn: () => apiClient.get<{ aggregate: Record<string, number>; total: number }>(`${BASE}/events/${eventId}/status`),
    enabled: !!eventId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useCreateEmergencyEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-emergency", "create"],
    mutationFn: (body: {
      name: string;
      type: EmergencyEventType;
      locationId?: string;
      message: string;
    }) => apiClient.post<EmergencyEvent>(`${BASE}/events`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emergencyKeys.all });
      toast.success("Emergency event created");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateEmergencyEvent(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-emergency", "update", eventId],
    mutationFn: (body: Partial<{ name: string; message: string; status: EmergencyEventStatus }>) =>
      apiClient.patch<EmergencyEvent>(`${BASE}/events/${eventId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emergencyKeys.detail(eventId) });
      void qc.invalidateQueries({ queryKey: emergencyKeys.all });
      toast.success("Emergency event updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteEmergencyEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-emergency", "delete"],
    mutationFn: (eventId: string) => apiClient.delete(`${BASE}/events/${eventId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emergencyKeys.all });
      toast.success("Emergency event deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useBroadcastEmergency(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-emergency", "broadcast", eventId],
    mutationFn: (body: { message?: string }) =>
      apiClient.post<{ broadcasted: number; eventId: string }>(`${BASE}/events/${eventId}/broadcast`, body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: emergencyKeys.status(eventId) });
      toast.success(`Broadcast sent to ${data.broadcasted} employees`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useRespondToEmergency(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr-emergency", "respond", eventId],
    mutationFn: (body: { status: "safe" | "need_help"; note?: string }) =>
      apiClient.post<EmergencyResponse>(`${BASE}/events/${eventId}/respond`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emergencyKeys.status(eventId) });
      toast.success("Response recorded");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
