import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { HrEmployeesParams } from "./employee-list";

export function employeeListQueryOptions(params?: HrEmployeesParams) {
  return {
    queryKey: humanResourcesQueryKeys.hr.employees(params),
    staleTime: 2 * 60_000,
  } as const;
}
