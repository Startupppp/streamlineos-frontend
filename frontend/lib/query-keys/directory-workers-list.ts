import { queryKeys } from "@/lib/query-keys";

export const WORKERS_PAGE_SIZE = 20;

export interface WorkersListParams {
  cursor?: string;
  limit?: number;
  status?: string;
  search?: string;
  organizationPersonId?: string;
}

export function workersListParams(params: WorkersListParams = {}): Record<string, unknown> {
  const { cursor, limit = WORKERS_PAGE_SIZE, status, search, organizationPersonId } = params;
  const queryParams: Record<string, unknown> = { cursor, limit };
  if (status) queryParams.status = status;
  if (search) queryParams.search = search;
  if (organizationPersonId) queryParams.organizationPersonId = organizationPersonId;
  return queryParams;
}

export function workersListKey(params: WorkersListParams = {}) {
  return queryKeys.directory.workers(workersListParams(params));
}
