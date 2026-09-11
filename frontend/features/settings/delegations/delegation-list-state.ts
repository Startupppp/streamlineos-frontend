import { parsePageSize, type SearchParamsReader } from "@/lib/list-pagination";

export const DELEGATION_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_DELEGATION_PAGE_SIZE = 20;

export type DelegationListKind = "received" | "granted";

interface DelegationListState {
  limit: number;
  search: string;
}

export const DELEGATION_URL_KEYS = {
  received: {
    page: "receivedPage",
    size: "receivedSize",
    search: "receivedSearch",
  },
  granted: {
    page: "grantedPage",
    size: "grantedSize",
    search: "grantedSearch",
  },
} as const;

export function readDelegationListState(
  params: SearchParamsReader,
  kind: DelegationListKind,
): DelegationListState {
  const keys = DELEGATION_URL_KEYS[kind];
  return {
    limit: parsePageSize(
      params.get(keys.size),
      DELEGATION_PAGE_SIZE_OPTIONS,
      DEFAULT_DELEGATION_PAGE_SIZE,
    ),
    search: params.get(keys.search)?.trim() ?? "",
  };
}
