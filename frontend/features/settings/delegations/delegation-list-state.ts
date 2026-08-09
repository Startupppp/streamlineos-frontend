import { parsePage, parsePageSize } from "@/lib/list-pagination";

export const DELEGATION_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_DELEGATION_PAGE_SIZE = 20;

export type DelegationListKind = "received" | "granted";

interface DelegationListState {
  page: number;
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

interface SearchParamsReader {
  get(name: string): string | null;
}

export function readDelegationListState(
  params: SearchParamsReader,
  kind: DelegationListKind,
): DelegationListState {
  const keys = DELEGATION_URL_KEYS[kind];
  return {
    page: parsePage(params.get(keys.page)),
    limit: parsePageSize(
      params.get(keys.size),
      DELEGATION_PAGE_SIZE_OPTIONS,
      DEFAULT_DELEGATION_PAGE_SIZE,
    ),
    search: params.get(keys.search)?.trim() ?? "",
  };
}

export function buildDelegationListUrl(
  endpoint: string,
  state: DelegationListState,
): string {
  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(state.limit),
  });
  if (state.search) params.set("search", state.search);
  return `${endpoint}?${params.toString()}`;
}
