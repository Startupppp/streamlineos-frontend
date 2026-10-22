import { employeeSupportQueryKeys } from "@/lib/query-keys/employee-support";
import type { MyRequestsParams } from "./support";

const keys = employeeSupportQueryKeys.employeeSupport;

export function mySupportRequestsQueryOptions(params: MyRequestsParams) {
  return {
    queryKey: keys.myRequests(params),
    staleTime: 15_000,
  } as const;
}
