import { queryKeyBase } from "@/lib/query-keys/base";
import type { EmergencyEventStatus } from "./enterprise-ops-emergency";

export const emergencyKeys = {
  all: [...queryKeyBase, "hr-emergency"] as const,
  list: (p: Record<string, unknown>) => [...queryKeyBase, "hr-emergency", "list", p] as const,
  detail: (id: string) => [...queryKeyBase, "hr-emergency", "detail", id] as const,
  status: (id: string) => [...queryKeyBase, "hr-emergency", "status", id] as const,
};

export function emergencyEventsListQueryOptions(params: { cursor?: string; status?: EmergencyEventStatus } = {}) {
  return {
    queryKey: emergencyKeys.list(params),
    staleTime: 30_000,
  };
}
