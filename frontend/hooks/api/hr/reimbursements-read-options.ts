import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const reimbursementKeys = {
  all: [...humanResourcesQueryKeys.hr.all, "reimbursements"] as const,
  list: () => [...humanResourcesQueryKeys.hr.all, "reimbursements", "list"] as const,
};

export function reimbursementsListQueryOptions() {
  return {
    queryKey: reimbursementKeys.list(),
    staleTime: 2 * 60_000,
  };
}
