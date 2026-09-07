"use client";

import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useGatedQuery } from "@/hooks/api/gated-query";
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

const _listHrEventsContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.listHrEventsContract),
);
const _getDataDictionaryContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.getDataDictionaryContract),
);
const _hrMetricDefinitionsContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.hrMetricDefinitionsContract),
);
const _hrEventsExportContract = lazyContract(() =>
  import("@/hooks/api/hr/enterprise-ops-schema").then((m) => m.hrEventsExportContract),
);

export function useHrEvents(params: ListEventsParams = {}) {
  return useGatedQuery("hr:eventstream:view", {
    queryKey: streamKeys.list(params),
    queryFn: ({ signal }) => apiClient.get(`${BASE}/events`, params as Record<string, unknown>, signal, _listHrEventsContract),
    staleTime: 30_000,
  });
}

export function useHrEventDataDictionary() {
  return useGatedQuery("hr:eventstream:view", {
    queryKey: streamKeys.dictionary,
    queryFn: ({ signal }) => apiClient.get(`${BASE}/data-dictionary`, undefined, signal, _getDataDictionaryContract),
    staleTime: 300_000,
  });
}

export function useHrMetricDefinitions() {
  return useGatedQuery("hr:eventstream:view", {
    queryKey: streamKeys.metrics,
    queryFn: ({ signal }) => apiClient.get(`${BASE}/metric-definitions`, undefined, signal, _hrMetricDefinitionsContract),
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
    }) => apiClient.post(`${BASE}/export`, body, undefined, _hrEventsExportContract),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
