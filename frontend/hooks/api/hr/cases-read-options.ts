import { queryKeyBase } from "@/lib/query-keys/base";
import type { ListCasesParams } from "@/hooks/api/hr/cases";

export const caseKeys = {
  all: [...queryKeyBase, "hr", "cases"] as const,
  list: (params: ListCasesParams) => [...queryKeyBase, "hr", "cases", "list", params] as const,
  detail: (id: number) => [...queryKeyBase, "hr", "cases", "detail", id] as const,
  notes: (id: number) => [...queryKeyBase, "hr", "cases", "notes", id] as const,
  documents: (id: number) => [...queryKeyBase, "hr", "cases", "documents", id] as const,
  stats: [...queryKeyBase, "hr", "cases", "stats"] as const,
  disciplinary: [...queryKeyBase, "hr", "disciplinary"] as const,
  disciplinaryMine: [...queryKeyBase, "hr", "disciplinary", "mine"] as const,
  disciplinaryList: (params: Record<string, unknown>) => [...queryKeyBase, "hr", "disciplinary", "list", params] as const,
};

export function hrCasesListQueryOptions(params: ListCasesParams = {}) {
  return {
    queryKey: caseKeys.list(params),
    staleTime: 30_000,
  };
}
