"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeyBase } from "@/lib/query-keys/base";

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
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

const BASE = "/hr/enterprise/ops/emergency";

const emergencyKeys = {
  all: [...queryKeyBase, "hr-emergency"] as const,
  list: (p: Record<string, unknown>) => [...queryKeyBase, "hr-emergency", "list", p] as const,
  detail: (id: string) => [...queryKeyBase, "hr-emergency", "detail", id] as const,
  status: (id: string) => [...queryKeyBase, "hr-emergency", "status", id] as const,
};

const _listEmergencyEventsContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.listEmergencyEventsContract),
);
const _getEmergencyEventContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.getEmergencyEventContract),
);
const _getEventStatusContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.getEventStatusContract),
);
const _createEmergencyEventContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.createEmergencyEventContract),
);
const _updateEmergencyEventContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.updateEmergencyEventContract),
);
const _broadcastResponseContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.broadcastResponseContract),
);
const _respondToEventContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.respondToEventContract),
);

export function useEmergencyEvents(params: { cursor?: string; status?: EmergencyEventStatus } = {}) {
  return useGatedQuery("hr:emergency:manage", {
    queryKey: emergencyKeys.list(params),
    queryFn: ({ signal }) => apiClient.get(`${BASE}/events`, params, signal, _listEmergencyEventsContract),
    staleTime: 30_000,
  });
}

export function useEmergencyEvent(eventId: string) {
  return useGatedQuery("hr:emergency:manage", {
    queryKey: emergencyKeys.detail(eventId),
    queryFn: ({ signal }) => apiClient.get(`${BASE}/events/${eventId}`, undefined, signal, _getEmergencyEventContract),
    enabled: !!eventId,
    staleTime: 15_000,
  });
}

export function useEmergencyEventStatus(eventId: string) {
  return useGatedQuery("hr:emergency:manage", {
    queryKey: emergencyKeys.status(eventId),
    queryFn: ({ signal }) => apiClient.get(`${BASE}/events/${eventId}/status`, undefined, signal, _getEventStatusContract),
    enabled: !!eventId,
    staleTime: 35_000,
    refetchInterval: 30_000,
  });
}

export function useCreateEmergencyEvent() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:emergency:manage", {
    mutationKey: ["hr-emergency", "create"],
    mutationFn: (body: {
      name: string;
      type: EmergencyEventType;
      locationId?: string;
      message: string;
    }) => apiClient.post(`${BASE}/events`, body, undefined, _createEmergencyEventContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emergencyKeys.all });
      toast.success("Emergency event created");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateEmergencyEvent(eventId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:emergency:manage", {
    mutationKey: ["hr-emergency", "update", eventId],
    mutationFn: (body: Partial<{ name: string; message: string; status: EmergencyEventStatus }>) =>
      apiClient.patch(`${BASE}/events/${eventId}`, body, undefined, _updateEmergencyEventContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emergencyKeys.detail(eventId) });
      void qc.invalidateQueries({ queryKey: emergencyKeys.all });
      toast.success("Emergency event updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useBroadcastEmergency(eventId: string) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:emergency:manage", {
    mutationKey: ["hr-emergency", "broadcast", eventId],
    mutationFn: (body: { message?: string }) =>
      apiClient.post(`${BASE}/events/${eventId}/broadcast`, body, undefined, _broadcastResponseContract),
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
      apiClient.post(`${BASE}/events/${eventId}/respond`, body, undefined, _respondToEventContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: emergencyKeys.status(eventId) });
      toast.success("Response recorded");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
