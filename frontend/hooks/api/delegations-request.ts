export interface DelegationListParams {
  limit: number;
  search: string;
  cursor?: string;
}

// One param set for the browser read and its server prefetch, so both request the same page.
export function delegationListParams(
  params: DelegationListParams,
): Record<string, string> {
  const query: Record<string, string> = { limit: String(params.limit) };
  if (params.cursor) query.cursor = params.cursor;
  if (params.search) query.search = params.search;
  return query;
}

export function delegationListQuery(params: DelegationListParams): string {
  return new URLSearchParams(delegationListParams(params)).toString();
}
