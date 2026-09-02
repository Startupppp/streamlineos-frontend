"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeyBase } from "@/lib/query-keys/base";

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
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export interface ListEventsParams {
  cursor?: string;
  limit?: number;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
}

const BASE = "/hr/enterprise/ops/event-stream";

const streamKeys = {
  all: [...queryKeyBase, "hr-event-stream"] as const,
  list: (p: ListEventsParams) => [...queryKeyBase, "hr-event-stream", "list", p] as const,
  dictionary: [...queryKeyBase, "hr-event-stream", "dictionary"] as const,
  metrics: [...queryKeyBase, "hr-event-stream", "metrics"] as const,
};

export function useHrEvents(params: ListEventsParams = {}) {
  return useQuery({
    queryKey: streamKeys.list(params),
    queryFn: ({ signal }) => apiClient.get<PaginatedResult<HrEvent>>(`${BASE}/events`, params as Record<string, unknown>, signal),
    staleTime: 30_000,
  });
}

export function useHrEventDataDictionary() {
  return useQuery({
    queryKey: streamKeys.dictionary,
    queryFn: ({ signal }) => apiClient.get<{ catalog: EventCatalogEntry[]; immutable: boolean }>(`${BASE}/data-dictionary`, undefined, signal),
    staleTime: 300_000,
  });
}

export function useHrMetricDefinitions() {
  return useQuery({
    queryKey: streamKeys.metrics,
    queryFn: ({ signal }) => apiClient.get<{ metrics: Array<{ name: string; description: string; aggregation: string }> }>(`${BASE}/metric-definitions`),
    staleTime: 300_000,
  });
}

export function useExportHrEvents() {
  return useAuthorizedMutation("hr:analytics:read", {
    mutationKey: ["hr-event-stream", "export"],
    mutationFn: (body: {
      cursor?: string;
      limit?: number;
      eventType?: string;
      entityType?: string;
      fromDate?: string;
      toDate?: string;
    }) => apiClient.post<{
      exportedAt: string;
      data: HrEvent[];
      pagination: PaginatedResult<HrEvent>["pagination"];
    }>(`${BASE}/export`, body),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
