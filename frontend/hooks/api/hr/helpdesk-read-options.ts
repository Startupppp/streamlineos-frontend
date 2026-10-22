import { employeeSupportQueryKeys } from "@/lib/query-keys/employee-support";
import type { HelpdeskListParams } from "@/hooks/api/hr/helpdesk";

const keys = employeeSupportQueryKeys.employeeSupport;

export function helpdeskQueueListQueryOptions(params: HelpdeskListParams) {
  return {
    queryKey: keys.queueList(params),
    staleTime: 15_000,
  } as const;
}
