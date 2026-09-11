import { parsePageSize, type SearchParamsReader } from "@/lib/list-pagination";
import type { UserListParams } from "@/hooks/api/users/types";

export const USER_SORT_FIELDS = ["name", "joinedAt", "status"] as const;
export const USER_SORT_DIRECTIONS = ["asc", "desc"] as const;
export const USER_STATUS_FILTERS = ["active", "suspended", "archived"] as const;

export type UsersListState = UserListParams &
  Required<Pick<UserListParams, "limit" | "sortBy" | "sortOrder">>;

// The one place the members URL becomes a query key, so the server prefetch and the page agree.
export function readUsersListState(params: SearchParamsReader): UsersListState {
  const status = params.get("status") ?? "all";
  const role = params.get("role") ?? "all";
  const departmentId = params.get("departmentId") ?? "all";
  const branchId = params.get("branchId") ?? "all";
  return {
    cursor: undefined,
    limit: parsePageSize(params.get("size")),
    search: params.get("search") || undefined,
    status: USER_STATUS_FILTERS.find((candidate) => candidate === status),
    role: role !== "all" ? role : undefined,
    departmentId: departmentId !== "all" ? departmentId : undefined,
    branchId: branchId !== "all" ? branchId : undefined,
    sortBy:
      USER_SORT_FIELDS.find((candidate) => candidate === params.get("sortBy")) ??
      "joinedAt",
    sortOrder:
      USER_SORT_DIRECTIONS.find(
        (candidate) => candidate === params.get("sortOrder"),
      ) ?? "desc",
  };
}
