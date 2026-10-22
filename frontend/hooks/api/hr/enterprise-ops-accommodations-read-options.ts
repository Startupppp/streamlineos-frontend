import { queryKeyBase } from "@/lib/query-keys/base";
import type { ListAccommodationsParams } from "./enterprise-ops-accommodations";

export const accKeys = {
  all: [...queryKeyBase, "hr-accommodations"] as const,
  list: (p: ListAccommodationsParams) => [...queryKeyBase, "hr-accommodations", "list", p] as const,
  detail: (id: string) => [...queryKeyBase, "hr-accommodations", "detail", id] as const,
  tasks: (id: string) => [...queryKeyBase, "hr-accommodations", "tasks", id] as const,
};

export function accommodationsListQueryOptions(params: ListAccommodationsParams = {}) {
  return {
    queryKey: accKeys.list(params),
    staleTime: 30_000,
  };
}
