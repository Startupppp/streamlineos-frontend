"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

export interface HrEvent {
  id: string;
  orgId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  actorUserId: string | null;
  occurredAt: string;
}

export interface EventCatalogEntry {
  eventType: string;
  description: string;
  entityTypes: string[];
}

interface PaginatedResult<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ListEventsParams {
  page?: number;
  limit?: number;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
}

const BASE = "/hr/enterprise/ops/event-stream";

const streamKeys = {
  all: ["hr-event-stream"] as const,
  list: (p: ListEventsParams) => ["hr-event-stream", "list", p] as const,
  dictionary: ["hr-event-stream", "dictionary"] as const,
  metrics: ["hr-event-stream", "metrics"] as const,
};

export function useHrEvents(params: ListEventsParams = {}) {
  return useQuery({
    queryKey: streamKeys.list(params),
    queryFn: () => apiClient.get<PaginatedResult<HrEvent>>(`${BASE}/events`, params as Record<string, unknown>),
    staleTime: 30_000,
  });
}

export function useHrEventDataDictionary() {
  return useQuery({
    queryKey: streamKeys.dictionary,
    queryFn: () => apiClient.get<{ catalog: EventCatalogEntry[]; immutable: boolean }>(`${BASE}/data-dictionary`),
    staleTime: 300_000,
  });
}

export function useHrMetricDefinitions() {
  return useQuery({
    queryKey: streamKeys.metrics,
    queryFn: () => apiClient.get<{ metrics: Array<{ name: string; description: string; aggregation: string }> }>(`${BASE}/metric-definitions`),
    staleTime: 300_000,
  });
}

export function useExportHrEvents() {
  return useMutation({
    mutationKey: ["hr-event-stream", "export"],
    mutationFn: (body: {
      page?: number;
      limit?: number;
      eventType?: string;
      entityType?: string;
      fromDate?: string;
      toDate?: string;
    }) => apiClient.post<{ exportedAt: string; data: HrEvent[]; pagination: unknown }>(`${BASE}/export`, body),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
