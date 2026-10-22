import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";

type GoalLevel = "company" | "team" | "individual";
type GoalStatus = "not_started" | "on_track" | "at_risk" | "off_track" | "completed";
type KeyResultMetric = "number" | "percentage" | "currency" | "boolean";

export interface GoalsParams {
  status?: GoalStatus | GoalStatus[];
  level?: GoalLevel;
  ownerId?: string | string[];
  projectId?: number;
  managedProductId?: number;
  search?: string;
  page?: number;
  limit?: number;
  health?: string | string[];
  due?: string;
  scope?: string;
  metricType?: KeyResultMetric;
}

export function toGoalsQueryParams(params?: GoalsParams): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const { status, health, ownerId, ...rest } = params;
  const result: Record<string, unknown> = { ...rest };
  if (Array.isArray(status)) {
    if (status.length > 0) result["status"] = status.join(",");
  } else if (status) {
    result["status"] = status;
  }
  if (Array.isArray(health)) {
    if (health.length > 0) result["health"] = health.join(",");
  } else if (health) {
    result["health"] = health;
  }
  if (Array.isArray(ownerId)) {
    if (ownerId.length > 0) result["ownerId"] = ownerId.join(",");
  } else if (ownerId) {
    result["ownerId"] = ownerId;
  }
  return result;
}

export function goalsListQueryOptions(params?: GoalsParams) {
  const queryParams = toGoalsQueryParams(params);
  return {
    queryKey: accountingAndSupportQueryKeys.goals.list(queryParams),
    staleTime: 30_000,
  };
}
