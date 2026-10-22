import { queryKeyBase } from "@/lib/query-keys/base";
import type { ListEventsParams } from "./enterprise-ops-event-stream";

export const streamKeys = {
  all: [...queryKeyBase, "hr-event-stream"] as const,
  list: (p: ListEventsParams) => [...queryKeyBase, "hr-event-stream", "list", p] as const,
  dictionary: [...queryKeyBase, "hr-event-stream", "dictionary"] as const,
  metrics: [...queryKeyBase, "hr-event-stream", "metrics"] as const,
};

export function hrEventsListQueryOptions(params: ListEventsParams = {}) {
  return {
    queryKey: streamKeys.list(params),
    staleTime: 30_000,
  };
}
